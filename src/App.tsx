import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, ClockCounterClockwise, TestTube, ArrowsLeftRight } from '@phosphor-icons/react';
import QuoteCalculator from './components/QuoteCalculator';
import QuoteHistory from './components/QuoteHistory';
import { ClientHarmonizationTool } from './components/ClientHarmonizationTool';
import QuotePage from './pages/quote';
import type { Quote } from './lib/types';
import { APP_VERSION } from '@momentum/version';

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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator size={18} />
              Quote Calculator
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClockCounterClockwise size={18} />
              Quote History
            </TabsTrigger>
            <TabsTrigger value="harmonization" className="flex items-center gap-2">
              <ArrowsLeftRight size={18} />
              Client Harmonization
            </TabsTrigger>
            <TabsTrigger value="quote" className="flex items-center gap-2">
              <TestTube size={18} />
              API Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <QuoteCalculator onQuoteCalculated={handleQuoteCalculated} />
          </TabsContent>

          <TabsContent value="history">
            <QuoteHistory />
          </TabsContent>

          <TabsContent value="harmonization">
            <ClientHarmonizationTool />
          </TabsContent>

          <TabsContent value="quote">
            <QuotePage />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer with version */}
      <footer className="mt-16 py-4 border-t border-border">
        <div className="container mx-auto px-4">
          <div id="app-version" className="text-center text-sm text-muted-foreground">
            Momentum {APP_VERSION}
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default App;