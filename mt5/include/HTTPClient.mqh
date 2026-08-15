//+------------------------------------------------------------------+
//|                                                   HTTPClient.mqh |
//|                                  Smart Trading System MQL5 Client|
//+------------------------------------------------------------------+
#property strict

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
      int res = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
      return (res == 200);
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
      int res = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);
      if(res == 200)
        {
         outResponse = CharArrayToString(result);
         return true;
        }
      return false;
     }

   bool SendExecutionResult(string correlationId, string symbol, ulong ticket, string action, double lots, double openPrice, double sl, double tp, bool success, string errorMsg)
     {
      string url = m_backendUrl + "/api/v1/ea/execution-result";
      string headers = GetHeaders();

      string jsonPayload = StringFormat(
         "{\"correlationId\":\"%s\",\"installationId\":\"%s\",\"symbol\":\"%s\",\"ticket\":%I64u,\"action\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"success\":%s,\"error\":\"%s\"}",
         correlationId, m_installationId, symbol, ticket, action, lots, openPrice, sl, tp, success ? "true" : "false", errorMsg
      );

      char postData[];
      StringToCharArray(jsonPayload, postData, 0, StringLen(jsonPayload));
      char result[];
      string resultHeaders;

      int res = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
      return (res == 200);
     }
  };
