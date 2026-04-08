import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, TestTube, CheckCircle, XCircle } from "lucide-react";
import { LeadAssignmentAutomation } from "@/types/automation";

interface AutomationTestPanelProps {
  automations: LeadAssignmentAutomation[];
  onClose: () => void;
}

interface TestResult {
  automation: LeadAssignmentAutomation;
  matched: boolean;
  reason: string;
}

const conditionTypeLabels = {
  contains: "contiene",
  equals: "è uguale a", 
  starts_with: "inizia con",
  ends_with: "finisce con",
  not_contains: "non contiene"
};

const actionTypeLabels = {
  assign_to_seller: "Assegna a venditore specifico",
  assign_to_previous_seller: "Assegna al venditore precedente"
};

export function AutomationTestPanel({ automations, onClose }: AutomationTestPanelProps) {
  const [testValue, setTestValue] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const checkCondition = (ultimaFonte: string, conditionType: string, conditionValues: string[]): boolean => {
    if (!ultimaFonte || !conditionValues || conditionValues.length === 0) return false;
    
    const fonte = ultimaFonte.toLowerCase();
    
    // Check if any of the condition values match
    return conditionValues.some(conditionValue => {
      const value = conditionValue.toLowerCase();
      
      switch (conditionType) {
        case 'contains':
          return fonte.includes(value);
        case 'equals':
          return fonte === value;
        case 'starts_with':
          return fonte.startsWith(value);
        case 'ends_with':
          return fonte.endsWith(value);
        case 'not_contains':
          return !fonte.includes(value);
        default:
          return false;
      }
    });
  };

  const runTest = () => {
    if (!testValue.trim()) return;

    const results: TestResult[] = [];
    let foundMatch = false;

    for (const automation of automations) {
      const matched = checkCondition(testValue, automation.condition_type, automation.condition_value);
      
      let reason = "";
      if (matched && !foundMatch) {
        reason = "✅ Questa automazione verrebbe eseguita";
        foundMatch = true;
      } else if (matched && foundMatch) {
        reason = "⏸️ Questa automazione corrisponde ma non verrebbe eseguita (priorità inferiore)";
      } else {
        reason = `❌ Condizione non soddisfatta: "${testValue}" ${conditionTypeLabels[automation.condition_type]} "${automation.condition_value.join(', ')}"`;
      }

      results.push({
        automation,
        matched,
        reason
      });
    }

    if (!foundMatch && automations.length > 0) {
      results.unshift({
        automation: {} as LeadAssignmentAutomation,
        matched: false,
        reason: "🚫 Nessuna automazione verrebbe eseguita per questo valore"
      });
    }

    setTestResults(results);
  };

  const testExamples = [
    { label: "Facebook Ads", value: "facebook,ads" },
    { label: "Instagram Stories", value: "instagram,stories" }, 
    { label: "Workshop Webinar", value: "workshop,webinar" },
    { label: "Google Ads", value: "google,adwords" }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TestTube className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Test Automazioni</CardTitle>
              <CardDescription>
                Testa come le automazioni reagiscono a diversi valori di "ultima_fonte"
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder='Inserisci valore di test (es. "facebook,ads")'
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTest()}
          />
          <Button onClick={runTest} disabled={!testValue.trim()}>
            Testa
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Esempi:</span>
          {testExamples.map((example) => (
            <Button
              key={example.value}
              variant="outline"
              size="sm"
              onClick={() => setTestValue(example.value)}
            >
              {example.label}
            </Button>
          ))}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Risultati del Test:</h4>
            
            {testResults[0]?.automation?.id === undefined && (
              <div className="p-3 rounded-lg bg-muted border-l-4 border-orange-500">
                <div className="text-sm">{testResults[0].reason}</div>
              </div>
            )}

            {testResults.filter(r => r.automation.id).map((result, index) => (
              <div
                key={result.automation.id || index}
                className={`p-3 rounded-lg border-l-4 ${
                  result.matched && index === 0 
                    ? 'bg-green-50 border-green-500'
                    : result.matched
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-muted border-muted-foreground'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {result.matched && index === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : result.matched ? (
                      <XCircle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{result.automation.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        Priorità {result.automation.priority}
                      </Badge>
                    </div>
                     <div className="text-xs text-muted-foreground mb-2">
                      {conditionTypeLabels[result.automation.condition_type]} "{result.automation.condition_value.join(', ')}" → {actionTypeLabels[result.automation.action_type]}
                    </div>
                    <div className="text-sm">{result.reason}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {automations.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            Nessuna automazione attiva da testare
          </div>
        )}
      </CardContent>
    </Card>
  );
}