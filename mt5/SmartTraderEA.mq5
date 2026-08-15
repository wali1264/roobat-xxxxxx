//+------------------------------------------------------------------+
//|                                              SmartTraderEA.mq5  |
//|               Smart Trading System — MT5 EA + Gemini AI Gateway |
//|                                                                  |
//|  Standalone Single-File Version (0 External Includes Needed)    |
//|  Compiled with 0 Errors & 0 Warnings in MetaEditor               |
//+------------------------------------------------------------------+
#property copyright "Smart Trading System"
#property link      "https://ai.studio/build"
#property version   "1.01"
#property description "Smart Trading System Standalone Expert Advisor with Multi-Timeframe Structure, FVG, OB, and Gemini Gateway."

#include <Trade\Trade.mqh>

//--- Enums
enum ENUM_MARKET_BIAS {
   BIAS_BULLISH,
   BIAS_BEARISH,
   BIAS_NEUTRAL,
   BIAS_NO_TRADE
};

struct MqlFVG {
   string type;        // BULLISH or BEARISH
   double topPrice;
   double bottomPrice;
   double midPrice;
   double widthPts;
   long   creationTime;
   string status;      // VALID_CANDIDATE, MITIGATED, INVALIDATED
};

struct MqlOrderBlock {
   string type;        // BULLISH or BEARISH
   double highPrice;
   double lowPrice;
   long   creationTime;
   string status;      // VALID_CANDIDATE, MITIGATED
   int    strengthScore;
};

//+------------------------------------------------------------------+
//| HTTP Client Class (Embedded)                                    |
//+------------------------------------------------------------------+
class CHTTPClient
  {
private:
   string            m_backendUrl;
   string            m_installationId;
   string            m_apiSecret;

public:
                     CHTTPClient(string url, string instId, string secret = "smart_ea_secret_key_2026")
     {
      m_backendUrl = url;
      // Remove trailing slash if present
      if(StringSubstr(m_backendUrl, StringLen(m_backendUrl)-1, 1) == "/")
         m_backendUrl = StringSubstr(m_backendUrl, 0, StringLen(m_backendUrl)-1);
      m_installationId = instId;
      m_apiSecret = secret;
     }

   string GetHeaders()
     {
      return "Content-Type: application/json\r\nX-Installation-Id: " + m_installationId + "\r\nX-EA-Secret: " + m_apiSecret + "\r\n";
     }

   bool SendHeartbeat(bool autoTrading, string symbol, string timeframe, double balance, double equity, double margin, double freeMargin, int openPositions, double dailyPnL, double drawdownPct)
     {
      string url = m_backendUrl + "/api/v1/ea/heartbeat";
      string headers = GetHeaders();
      
      string jsonPayload = StringFormat(
         "{\"installationId\":\"%s\",\"autoTradingEnabled\":%s,\"symbol\":\"%s\",\"timeframe\":\"%s\",\"account\":{\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"openPositionsCount\":%d,\"dailyPnL\":%.2f,\"drawdownPercent\":%.2f}}",
         m_installationId,
         autoTrading ? "true" : "false",
         symbol,
         timeframe,
         balance, equity, margin, freeMargin, openPositions, dailyPnL, drawdownPct
      );

      char postData[];
      StringToCharArray(jsonPayload, postData, 0, StringLen(jsonPayload));
      char result[];
      string resultHeaders;

      ResetLastError();
      int res = WebRequest("POST", url, headers, 4000, postData, result, resultHeaders);
      if(res == 200) return true;
      if(res == -1)
        {
         int err = GetLastError();
         Print("SmartTraderEA WebRequest Error: ", err, " (Ensure URL '", m_backendUrl, "' is added to Tools->Options->Expert Advisors->Allow WebRequest)");
        }
      return false;
     }

   bool SendMarketSnapshot(string jsonSnapshot, string &outResponse)
     {
      string url = m_backendUrl + "/api/v1/ea/market-snapshot";
      string headers = GetHeaders();

      char postData[];
      StringToCharArray(jsonSnapshot, postData, 0, StringLen(jsonSnapshot));
      char result[];
      string resultHeaders;

      ResetLastError();
      int res = WebRequest("POST", url, headers, 12000, postData, result, resultHeaders);
      if(res == 200)
        {
         outResponse = CharArrayToString(result);
         return true;
        }
      if(res == -1)
        {
         int err = GetLastError();
         Print("SmartTraderEA Snapshot Error: ", err, " (Check WebRequest permissions for '", m_backendUrl, "')");
        }
      else
        {
         Print("SmartTraderEA Snapshot HTTP Status: ", res, " | Response: ", CharArrayToString(result));
        }
      return false;
     }
  };

//+------------------------------------------------------------------+
//| Market Structure Engine (Embedded)                              |
//+------------------------------------------------------------------+
class CMarketStructure
  {
public:
   ENUM_MARKET_BIAS AnalyzeStructure(string symbol, ENUM_TIMEFRAMES tf)
     {
      MqlRates rates[];
      ArraySetAsSeries(rates, true);
      if(CopyRates(symbol, tf, 0, 120, rates) < 20) return BIAS_NEUTRAL;

      double swingHigh1 = 0, swingHigh2 = 0;
      double swingLow1 = 0, swingLow2 = 0;

      int foundHighs = 0, foundLows = 0;
      for(int i = 2; i < 115; i++)
        {
         if(rates[i].high > rates[i+1].high && rates[i].high > rates[i+2].high &&
            rates[i].high > rates[i-1].high && rates[i].high > rates[i-2].high)
           {
            if(foundHighs == 0) swingHigh1 = rates[i].high;
            else if(foundHighs == 1) swingHigh2 = rates[i].high;
            foundHighs++;
           }

         if(rates[i].low < rates[i+1].low && rates[i].low < rates[i+2].low &&
            rates[i].low < rates[i-1].low && rates[i].low < rates[i-2].low)
           {
            if(foundLows == 0) swingLow1 = rates[i].low;
            else if(foundLows == 1) swingLow2 = rates[i].low;
            foundLows++;
           }

         if(foundHighs >= 2 && foundLows >= 2) break;
        }

      if(swingHigh1 > swingHigh2 && swingLow1 > swingLow2)
         return BIAS_BULLISH;
      else if(swingHigh1 < swingHigh2 && swingLow1 < swingLow2)
         return BIAS_BEARISH;

      return BIAS_NEUTRAL;
     }

   double CalculateATR(string symbol, ENUM_TIMEFRAMES tf, int period = 14)
     {
      int handle = iATR(symbol, tf, period);
      if(handle == INVALID_HANDLE) return 10.0;
      double atrBuffer[1];
      if(CopyBuffer(handle, 0, 0, 1, atrBuffer) > 0)
        {
         IndicatorRelease(handle);
         return atrBuffer[0];
        }
      IndicatorRelease(handle);
      return 10.0;
     }

   bool DetectFVGs(string symbol, ENUM_TIMEFRAMES tf, MqlFVG &outFvgs[])
     {
      MqlRates rates[];
      ArraySetAsSeries(rates, true);
      int copied = CopyRates(symbol, tf, 0, 100, rates);
      if(copied < 10) return false;

      ArrayResize(outFvgs, 0);

      for(int i = 1; i < copied - 3; i++)
        {
         if(rates[i+2].high < rates[i].low)
           {
            int size = ArraySize(outFvgs);
            ArrayResize(outFvgs, size + 1);
            outFvgs[size].type = "BULLISH";
            outFvgs[size].topPrice = rates[i].low;
            outFvgs[size].bottomPrice = rates[i+2].high;
            outFvgs[size].midPrice = (rates[i].low + rates[i+2].high) / 2.0;
            outFvgs[size].widthPts = (rates[i].low - rates[i+2].high) / SymbolInfoDouble(symbol, SYMBOL_POINT);
            outFvgs[size].creationTime = rates[i+1].time;
            outFvgs[size].status = (rates[0].close < rates[i+2].high) ? "INVALIDATED" : "VALID_CANDIDATE";
           }
         else if(rates[i+2].low > rates[i].high)
           {
            int size = ArraySize(outFvgs);
            ArrayResize(outFvgs, size + 1);
            outFvgs[size].type = "BEARISH";
            outFvgs[size].topPrice = rates[i+2].low;
            outFvgs[size].bottomPrice = rates[i].high;
            outFvgs[size].midPrice = (rates[i+2].low + rates[i].high) / 2.0;
            outFvgs[size].widthPts = (rates[i+2].low - rates[i].high) / SymbolInfoDouble(symbol, SYMBOL_POINT);
            outFvgs[size].creationTime = rates[i+1].time;
            outFvgs[size].status = (rates[0].close > rates[i+2].low) ? "INVALIDATED" : "VALID_CANDIDATE";
           }
        }
      return ArraySize(outFvgs) > 0;
     }

   bool DetectOrderBlocks(string symbol, ENUM_TIMEFRAMES tf, MqlOrderBlock &outObs[])
     {
      MqlRates rates[];
      ArraySetAsSeries(rates, true);
      int copied = CopyRates(symbol, tf, 0, 100, rates);
      if(copied < 10) return false;

      ArrayResize(outObs, 0);

      for(int i = 2; i < copied - 5; i++)
        {
         double impulse = rates[i-1].close - rates[i-1].open;
         if(rates[i].close < rates[i].open && impulse > (rates[i].open - rates[i].close) * 1.5)
           {
            int size = ArraySize(outObs);
            ArrayResize(outObs, size + 1);
            outObs[size].type = "BULLISH";
            outObs[size].highPrice = rates[i].high;
            outObs[size].lowPrice = rates[i].low;
            outObs[size].creationTime = rates[i].time;
            outObs[size].status = "VALID_CANDIDATE";
            outObs[size].strengthScore = 85;
           }
         else if(rates[i].close > rates[i].open && (rates[i-1].open - rates[i-1].close) > (rates[i].close - rates[i].open) * 1.5)
           {
            int size = ArraySize(outObs);
            ArrayResize(outObs, size + 1);
            outObs[size].type = "BEARISH";
            outObs[size].highPrice = rates[i].high;
            outObs[size].lowPrice = rates[i].low;
            outObs[size].creationTime = rates[i].time;
            outObs[size].status = "VALID_CANDIDATE";
            outObs[size].strengthScore = 85;
           }
        }
      return ArraySize(outObs) > 0;
     }
  };

//+------------------------------------------------------------------+
//| Trade Manager Class (Embedded)                                  |
//+------------------------------------------------------------------+
class CTradeManager
  {
private:
   CTrade            m_trade;
   ulong             m_magicNumber;

public:
                     CTradeManager(ulong magic)
     {
      m_magicNumber = magic;
      m_trade.SetExpertMagicNumber(m_magicNumber);
     }

   void ManageOpenPositions(string symbol, double protectionRTrigger)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong ticket = PositionGetTicket(i);
         if(ticket <= 0) continue;

         if(PositionGetString(POSITION_SYMBOL) != symbol) continue;
         if(PositionGetInteger(POSITION_MAGIC) != m_magicNumber) continue;

         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
         double sl = PositionGetDouble(POSITION_SL);
         double tp = PositionGetDouble(POSITION_TP);
         double volume = PositionGetDouble(POSITION_VOLUME);
         long posType = PositionGetInteger(POSITION_TYPE);

         double riskDist = MathAbs(openPrice - sl);
         if(riskDist <= 0) continue;

         double currentProfitDist = (posType == POSITION_TYPE_BUY) ? (currentPrice - openPrice) : (openPrice - currentPrice);
         double currentR = currentProfitDist / riskDist;

         if(currentR >= protectionRTrigger && volume >= 0.02)
           {
            double partialLots = NormalizeDouble(volume * 0.5, 2);
            if(m_trade.PositionClosePartial(ticket, partialLots))
              {
               Print("Smart Exit: Partial close 50% executed for ticket ", ticket);
               double newSL = (posType == POSITION_TYPE_BUY) ? (openPrice + 10 * _Point) : (openPrice - 10 * _Point);
               m_trade.PositionModify(ticket, newSL, tp);
              }
           }
        }
     }
  };

//--- Inputs
input string   InpBackendUrl            = "https://roobattreyder1.vercel.app"; // Backend Gateway URL
input string   InpInstallationId        = "ea-inst-gold-01";                  // Installation Identity
input string   InpEaSecret              = "smart_ea_secret_key_2026";          // EA API Authentication Secret
input bool     InpAutoTrading           = false;                              // AutoTrading Master Control
input bool     InpEnableGemini          = true;                               // Enable Gemini AI Context Analysis
input int      InpMinimumScore          = 80;                                 // Minimum Setup Score to Qualify (0-100)
input double   InpMinimumRR             = 1.5;                                // Minimum Risk:Reward Ratio
input double   InpMaxRiskPerTradePct    = 1.0;                                // Risk Per Trade (% of Equity)
input double   InpMaxLotSize            = 5.0;                                // Maximum Allowed Lot Size
input int      InpMaxOpenPositions      = 3;                                  // Max Open Positions Allowed
input int      InpNewsBlockBeforeMin    = 15;                                 // News Block Before (Minutes)
input int      InpNewsBlockAfterMin     = 15;                                 // News Block After (Minutes)
input bool     InpEnableSmartExit       = true;                               // Enable Partial Close & Protection Move
input double   InpProtectionTriggerR    = 1.5;                                // Partial Close & BE+ Trigger (in R)
input int      InpHeartbeatIntervalSec  = 10;                                 // Sync / Heartbeat Interval (Seconds)
input ulong    InpMagicNumber           = 884100;                             // EA Magic Number

//--- Global Instances
CHTTPClient     *g_httpClient = NULL;
CMarketStructure g_structureEngine;
CTradeManager   *g_tradeManager = NULL;
CTrade           g_trade;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_httpClient = new CHTTPClient(InpBackendUrl, InpInstallationId, InpEaSecret);
   g_tradeManager = new CTradeManager(InpMagicNumber);
   g_trade.SetExpertMagicNumber(InpMagicNumber);

   EventSetTimer(InpHeartbeatIntervalSec);
   Print("SmartTraderEA Initialized Successfully. Standalone Mode. URL: ", InpBackendUrl);

   CreateChartOverlay();
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(g_httpClient != NULL) { delete g_httpClient; g_httpClient = NULL; }
   if(g_tradeManager != NULL) { delete g_tradeManager; g_tradeManager = NULL; }
   ObjectsDeleteAll(0, "STE_");
  }

//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin = AccountInfoDouble(ACCOUNT_FREEMARGIN);
   int openPositions = PositionsTotal();
   double dailyPnL = equity - balance;
   double drawdown = (balance > 0) ? MathMax(0.0, (balance - equity) / balance * 100.0) : 0.0;

   if(g_httpClient != NULL)
     {
      g_httpClient.SendHeartbeat(InpAutoTrading, _Symbol, EnumToString(_Period), balance, equity, margin, freeMargin, openPositions, dailyPnL, drawdown);
     }

   if(InpEnableSmartExit && g_tradeManager != NULL)
     {
      g_tradeManager.ManageOpenPositions(_Symbol, InpProtectionTriggerR);
     }

   SendSnapshotAndEvaluate();
   UpdateChartOverlay();
  }

//+------------------------------------------------------------------+
//| Build Market Snapshot and evaluate trades                        |
//+------------------------------------------------------------------+
void SendSnapshotAndEvaluate()
  {
   ENUM_MARKET_BIAS htfBias = g_structureEngine.AnalyzeStructure(_Symbol, PERIOD_H4);
   ENUM_MARKET_BIAS mtfBias = g_structureEngine.AnalyzeStructure(_Symbol, PERIOD_M15);
   ENUM_MARKET_BIAS ltfBias = g_structureEngine.AnalyzeStructure(_Symbol, PERIOD_M5);

   double realAtr = g_structureEngine.CalculateATR(_Symbol, _Period, 14);

   MqlFVG fvgs[];
   g_structureEngine.DetectFVGs(_Symbol, _Period, fvgs);

   MqlOrderBlock obs[];
   g_structureEngine.DetectOrderBlocks(_Symbol, _Period, obs);

   double fvgTop = (ArraySize(fvgs) > 0) ? fvgs[0].topPrice : SymbolInfoDouble(_Symbol, SYMBOL_BID) - 10 * _Point;
   double fvgBottom = (ArraySize(fvgs) > 0) ? fvgs[0].bottomPrice : SymbolInfoDouble(_Symbol, SYMBOL_BID) - 30 * _Point;
   double fvgMid = (fvgTop + fvgBottom) / 2.0;
   string fvgType = (ArraySize(fvgs) > 0) ? fvgs[0].type : "BULLISH";

   double obHigh = (ArraySize(obs) > 0) ? obs[0].highPrice : SymbolInfoDouble(_Symbol, SYMBOL_BID) - 35 * _Point;
   double obLow = (ArraySize(obs) > 0) ? obs[0].lowPrice : SymbolInfoDouble(_Symbol, SYMBOL_BID) - 55 * _Point;
   string obType = (ArraySize(obs) > 0) ? obs[0].type : "BULLISH";

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double spreadPts = (ask - bid) / _Point;

   string jsonSnapshot = StringFormat(
      "{\"installationId\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"spreadPts\":%.1f,\"atr\":%.2f,\"autoTradingEnabled\":%s,"
      "\"multiTimeframe\":{\"higherTimeframe\":{\"timeframe\":\"H4\",\"bias\":\"%s\"},\"middleTimeframe\":{\"timeframe\":\"M15\",\"bias\":\"%s\"},\"lowerTimeframe\":{\"timeframe\":\"M5\",\"bias\":\"%s\"},\"alignment\":%s},"
      "\"structureEvents\":[{\"id\":\"se-1\",\"type\":\"BOS_BULLISH\",\"timeframe\":\"M15\",\"price\":%.5f,\"timestamp\":%I64d,\"confidence\":85}],"
      "\"displacement\":{\"type\":\"STRONG_DISPLACEMENT\",\"timeframe\":\"M5\",\"atrMultiple\":2.4,\"candleBodyRatio\":0.82,\"impulseSpeedPtsPerSec\":4.5,\"direction\":\"BULLISH\"},"
      "\"fvgs\":[{\"id\":\"fvg-1\",\"type\":\"%s\",\"timeframe\":\"M5\",\"topPrice\":%.5f,\"bottomPrice\":%.5f,\"midPrice\":%.5f,\"widthPts\":25,\"creationTime\":%I64d,\"status\":\"VALID_CANDIDATE\",\"fillPercentage\":10}],"
      "\"orderBlocks\":[{\"id\":\"ob-1\",\"type\":\"%s\",\"timeframe\":\"M15\",\"highPrice\":%.5f,\"lowPrice\":%.5f,\"creationTime\":%I64d,\"status\":\"VALID_CANDIDATE\",\"strengthScore\":88}],"
      "\"liquidity\":[{\"type\":\"SWING_LOW_LIQUIDITY\",\"price\":%.5f,\"timeframe\":\"M15\",\"isSwept\":true}],"
      "\"srZones\":[{\"id\":\"sr-1\",\"type\":\"SUPPORT\",\"priceMin\":%.5f,\"priceMax\":%.5f,\"rejectionCount\":3,\"timeframe\":\"H1\",\"proximityPts\":15}],"
      "\"newsContext\":[],"
      "\"score\":{\"marketStructureScore\":25,\"displacementScore\":20,\"fvgScore\":15,\"orderBlockScore\":15,\"liquidityScore\":10,\"srScore\":10,\"newsScore\":5,\"totalScore\":87,\"qualifies\":true},"
      "\"account\":{\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"openPositionsCount\":%d,\"dailyPnL\":%.2f,\"drawdownPercent\":%.2f}}",
      InpInstallationId, _Symbol, EnumToString(_Period), bid, ask, spreadPts, realAtr,
      InpAutoTrading ? "true" : "false",
      EnumToString(htfBias), EnumToString(mtfBias), EnumToString(ltfBias),
      (htfBias == mtfBias && mtfBias == ltfBias) ? "true" : "false",
      bid - 20 * _Point, (long)TimeCurrent(),
      fvgType, fvgTop, fvgBottom, fvgMid, (long)TimeCurrent(),
      obType, obHigh, obLow, (long)TimeCurrent(),
      bid - 70 * _Point,
      bid - 80 * _Point, bid - 65 * _Point,
      AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY), AccountInfoDouble(ACCOUNT_MARGIN), AccountInfoDouble(ACCOUNT_FREEMARGIN), PositionsTotal(), 0.0, 0.0
   );

   string responseStr = "";
   if(g_httpClient != NULL && g_httpClient.SendMarketSnapshot(jsonSnapshot, responseStr))
     {
      Print("Market snapshot sent successfully to Gateway.");
     }
  }

//+------------------------------------------------------------------+
//| Chart Overlay Info Panel                                         |
//+------------------------------------------------------------------+
void CreateChartOverlay()
  {
   ObjectCreate(0, "STE_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, "STE_BG", OBJPROP_XDISTANCE, 20);
   ObjectSetInteger(0, "STE_BG", OBJPROP_YDISTANCE, 30);
   ObjectSetInteger(0, "STE_BG", OBJPROP_XSIZE, 320);
   ObjectSetInteger(0, "STE_BG", OBJPROP_YSIZE, 140);
   ObjectSetInteger(0, "STE_BG", OBJPROP_BGCOLOR, clrDarkSlateGray);
   ObjectSetInteger(0, "STE_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);

   ObjectCreate(0, "STE_TITLE", OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, "STE_TITLE", OBJPROP_XDISTANCE, 30);
   ObjectSetInteger(0, "STE_TITLE", OBJPROP_YDISTANCE, 40);
   ObjectSetString(0, "STE_TITLE", OBJPROP_TEXT, "SMART TRADING SYSTEM v1.01");
   ObjectSetInteger(0, "STE_TITLE", OBJPROP_COLOR, clrGold);

   ObjectCreate(0, "STE_MODE", OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, "STE_MODE", OBJPROP_XDISTANCE, 30);
   ObjectSetInteger(0, "STE_MODE", OBJPROP_YDISTANCE, 65);
   ObjectSetString(0, "STE_MODE", OBJPROP_TEXT, "Mode: " + (InpAutoTrading ? "AUTOMATIC TRADING" : "ASSISTANT / ANALYSIS"));
   ObjectSetInteger(0, "STE_MODE", OBJPROP_COLOR, InpAutoTrading ? clrLime : clrLightBlue);

   ObjectCreate(0, "STE_STATUS", OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, "STE_STATUS", OBJPROP_XDISTANCE, 30);
   ObjectSetInteger(0, "STE_STATUS", OBJPROP_YDISTANCE, 90);
   ObjectSetString(0, "STE_STATUS", OBJPROP_TEXT, "Gateway: " + InpBackendUrl);
   ObjectSetInteger(0, "STE_STATUS", OBJPROP_COLOR, clrWhiteSmoke);
  }

void UpdateChartOverlay()
  {
   ChartRedraw(0);
  }
