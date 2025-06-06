
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: ""
  });
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const defaultTab = searchParams.get('tab') || 'signin';

  useEffect(() => {
    // Controlla se l'utente è già autenticato
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Inserisci email e password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Credenziali non valide");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Accesso effettuato con successo!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Inserisci la tua email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(formData.email);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Controlla la tua email per il link di reset della password");
        setShowResetPassword(false);
      }
    } catch (error) {
      toast.error("Errore durante il reset della password");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error("Compila entrambi i campi password");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password aggiornata con successo!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Errore durante l'aggiornamento della password");
    } finally {
      setLoading(false);
    }
  };

  // Se siamo nella modalità reset password dalla URL
  if (defaultTab === 'reset' || defaultTab === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Lead Management System
            </CardTitle>
            <CardDescription>
              {defaultTab === 'reset' ? 'Reset della password' : 'Aggiorna password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {defaultTab === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Invio in corso..." : "Invia link di reset"}
                </Button>
              </form>
            )}

            {defaultTab === 'update' && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <Input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    placeholder="Inserisci la nuova password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Conferma Nuova Password</Label>
                  <Input
                    id="confirm-new-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Conferma la nuova password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aggiornamento in corso..." : "Aggiorna Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Lead Management System
          </CardTitle>
          <CardDescription>
            Accedi al tuo account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showResetPassword ? (
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="La tua password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Accesso in corso..." : "Accedi"}
                </Button>
              </form>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => setShowResetPassword(true)}
                >
                  Hai dimenticato la password?
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Invio in corso..." : "Invia link di reset"}
                </Button>
              </form>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => setShowResetPassword(false)}
                >
                  Torna al login
                </Button>
              </div>
            </div>
          )}
          
          <Alert className="mt-4">
            <AlertDescription className="text-sm">
              <strong>Nota:</strong> Per questioni di sicurezza, la registrazione è disponibile solo per gli amministratori. 
              Contatta l'amministratore del sistema per ottenere l'accesso.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
