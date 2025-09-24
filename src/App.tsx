import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, ClockCounterClockwise } from '@phosphor-icons/react';
import QuoteCalculator from './components/QuoteCalculator';
import QuoteHistory from './components/QuoteHistory';
import type { Quote } from './lib/types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('calculator');

  const handleQuoteCalculated = (quote: Quote) => {
    // Switch to history tab to show the saved quote
    setActiveTab('history');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            C3PL Quote Calculator
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate accurate pricing quotes for third-party logistics services
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator size={18} />
              Quote Calculator
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClockCounterClockwise size={18} />
              Quote History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator">
            <QuoteCalculator onQuoteCalculated={handleQuoteCalculated} />
          </TabsContent>
          
          <TabsContent value="history">
            <QuoteHistory />
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  );
}

export default App;