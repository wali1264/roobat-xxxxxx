//+------------------------------------------------------------------+
//|                                             MarketStructure.mqh |
//|                                  Smart Trading System MQL5 Module|
//+------------------------------------------------------------------+
#property strict

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

struct MqlLiquidityLevel {
   string type;        // SWING_HIGH_LIQUIDITY, SWING_LOW_LIQUIDITY
   double price;
   bool   isSwept;
};

struct MqlSRZone {
   string type;        // SUPPORT, RESISTANCE
   double priceMin;
   double priceMax;
   int    rejectionCount;
};

class CMarketStructure
  {
public:
   ENUM_MARKET_BIAS AnalyzeStructure(string symbol, ENUM_TIMEFRAMES tf)
     {
      MqlRates rates[];
      ArraySetAsSeries(rates, true);
      if(CopyRates(symbol, tf, 0, 200, rates) < 20) return BIAS_NEUTRAL;

      double swingHigh1 = 0, swingHigh2 = 0;
      double swingLow1 = 0, swingLow2 = 0;

      int foundHighs = 0, foundLows = 0;
      for(int i = 2; i < 195; i++)
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
         return BIAS_BULLISH; // Higher Highs & Higher Lows
      else if(swingHigh1 < swingHigh2 && swingLow1 < swingLow2)
         return BIAS_BEARISH; // Lower Highs & Lower Lows

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
      int copied = CopyRates(symbol, tf, 0, 200, rates);
      if(copied < 10) return false;

      ArrayResize(outFvgs, 0);

      for(int i = 1; i < copied - 3; i++)
        {
         // Bullish FVG: Candle i+2 High < Candle i Low
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
         // Bearish FVG: Candle i+2 Low > Candle i High
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
      int copied = CopyRates(symbol, tf, 0, 200, rates);
      if(copied < 10) return false;

      ArrayResize(outObs, 0);

      for(int i = 2; i < copied - 5; i++)
        {
         // Bullish Order Block: Bearish candle preceding a strong bullish impulse
         double impulse = rates[i-1].close - rates[i-1].open;
         if(rates[i].close < rates[i].open && impulse > (rates[i].open - rates[i].close) * 1.8)
           {
            int size = ArraySize(outObs);
            ArrayResize(outObs, size + 1);
            outObs[size].type = "BULLISH";
            outObs[size].highPrice = rates[i].high;
            outObs[size].lowPrice = rates[i].low;
            outObs[size].creationTime = rates[i].time;
            outObs[size].status = "VALID_CANDIDATE";
            outObs[size].strengthScore = 88;
            break;
           }
         // Bearish Order Block: Bullish candle preceding a strong bearish impulse
         else if(rates[i].close > rates[i].open && (rates[i-1].open - rates[i-1].close) > (rates[i].close - rates[i].open) * 1.8)
           {
            int size = ArraySize(outObs);
            ArrayResize(outObs, size + 1);
            outObs[size].type = "BEARISH";
            outObs[size].highPrice = rates[i].high;
            outObs[size].lowPrice = rates[i].low;
            outObs[size].creationTime = rates[i].time;
            outObs[size].status = "VALID_CANDIDATE";
            outObs[size].strengthScore = 88;
            break;
           }
        }
      return ArraySize(outObs) > 0;
     }
  };

