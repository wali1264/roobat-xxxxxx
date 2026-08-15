//+------------------------------------------------------------------+
//|                                                 TradeManager.mqh |
//|                                  Smart Trading System MQL5 Module|
//+------------------------------------------------------------------+
#property strict
#include <Trade\Trade.mqh>

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

   // Manage open positions for partial close (50%) & breakeven protection
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

         // If reached Protection Trigger (e.g., 1.5R) and volume >= 0.02, close 50%
         if(currentR >= protectionRTrigger && volume >= 0.02)
           {
            double partialLots = NormalizeDouble(volume * 0.5, 2);
            if(m_trade.PositionClosePartial(ticket, partialLots))
              {
               Print("Smart Exit: Partial close 50% (", partialLots, " lots) executed for ticket ", ticket);
               // Move SL to protected BE+ (openPrice + 10 points)
               double newSL = (posType == POSITION_TYPE_BUY) ? (openPrice + 10 * _Point) : (openPrice - 10 * _Point);
               m_trade.PositionModify(ticket, newSL, tp);
              }
           }
        }
     }
  };
