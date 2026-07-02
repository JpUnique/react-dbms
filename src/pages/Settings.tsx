import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/services/api";

interface UserPreferences {
  dark_mode: boolean;
  email_notifications: boolean;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = useState<UserPreferences>({
    dark_mode: theme === 'dark',
    email_notifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from backend; sync dark_mode with ThemeContext.
  useEffect(() => {
    api
      .get<{ preferences: UserPreferences }>("/users/preferences")
      .then(data => {
        setPrefs(data.preferences);
        setTheme(data.preferences.dark_mode ? 'dark' : 'light');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [setTheme]);

  const save = async (updated: UserPreferences) => {
    setIsSaving(true);
    try {
      await api.put("/users/preferences", updated);
    } catch {
      // best-effort
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDarkMode = (val: boolean) => {
    const updated = { ...prefs, dark_mode: val };
    setPrefs(updated);
    setTheme(val ? 'dark' : 'light');
    void save(updated);
  };

  const toggleEmailNotifications = (val: boolean) => {
    const updated = { ...prefs, email_notifications: val };
    setPrefs(updated);
    void save(updated);
  };

  // Keep switch in sync when theme is toggled from TopBar.
  useEffect(() => {
    setPrefs(prev => ({ ...prev, dark_mode: theme === 'dark' }));
  }, [theme]);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account, security, and preferences
          </p>
        </div>

        {/* SECURITY */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Protect your account and manage authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">
                  Update your password regularly
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/settings/change-password")}>
                Change
              </Button>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Extra security for your account
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/settings/two-factor")}>
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PREFERENCES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preferences
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {prefs.dark_mode
                        ? <Moon className="h-4 w-4 text-primary" />
                        : <Sun className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div>
                      <p className="font-medium">Appearance</p>
                      <p className="text-sm text-muted-foreground">
                        Currently: <span className="font-medium capitalize">{theme} mode</span>
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.dark_mode}
                    onCheckedChange={toggleDarkMode}
                    aria-label="Toggle dark mode"
                  />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={prefs.email_notifications}
                    onCheckedChange={toggleEmailNotifications}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ACCOUNT ACTIONS */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out from this device
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={async () => { await logout(); navigate("/login"); }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
