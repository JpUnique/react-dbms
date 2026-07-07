import React, { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LicenseProvider } from "@/context/LicenseContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SplashScreen from "@/components/SplashScreen";
import VideoBackground from "@/components/VideoBackground";

// Pages
import Dashboard from "@/pages/Dashboard";
import DocumentList from "@/pages/DocumentList";
import DocumentUpload from "@/pages/DocumentUpload";
import DocumentView from "@/pages/DocumentView";
import DocumentBrowser from "@/pages/DocumentBrowser";
import FolderView from "@/pages/FolderView";
import PermissionsManagement from "@/pages/PermissionsManagement";
import Profile from "@/pages/Profile";
import ChangePassword from "@/pages/ChangePassword";
import TwoFactorAuth from "@/pages/TwoFactorAuth";
import TagView from "@/pages/TagView";
import TagsManagement from "@/pages/TagsManagement";
import RecentDocuments from "@/pages/RecentDocuments";
import StarredDocuments from "@/pages/StarredDocuments";
import UserManagement from "@/pages/UserManagement";
import DocumentShare from "@/pages/DocumentShare";
import LicenseActivation from "@/pages/LicenseActivation";
import LicenseManagement from "@/pages/LicenseManagement";
import LicenseDebug from "@/pages/LicenseDebug";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import LoginTwoFactorChallenge from "@/pages/LoginTwoFactorChallenge";
import TwoFactorSetupRequired from "@/pages/TwoFactorSetupRequired";
import ResetPasswordTwoFactor from "@/pages/ResetPasswordTwoFactor";
import Settings from "./pages/Settings";
import TrashPage from "@/pages/Trash";
import AuditLog from "@/pages/AuditLog";
import Reports from "@/pages/Reports";
import Search from "@/pages/Search";
import PublicShare from "@/pages/PublicShare";
import ReviewQueue from "@/pages/ReviewQueue";
import Collaborators from "@/pages/Collaborators";
import SharedWithMe from "@/pages/SharedWithMe";
import MyShareLinks from "@/pages/MyShareLinks";
import Chat from "@/pages/Chat";

const queryClient = new QueryClient();

//  PROTECTED ROUTE
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({
  element,
}) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return currentUser ? <>{element}</> : <Navigate to="/login" replace />;
};

//  FIXED PUBLIC ROUTE
const PublicRoute: React.FC<{
  element: React.ReactNode;
  allowWhenAuth?: boolean;
}> = ({ element, allowWhenAuth = false }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  //  Only block if NOT explicitly allowed
  if (currentUser && !allowWhenAuth) {
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
};

//  Shows the shared video background for as long as the user is
//  unauthenticated (splash, login, register, 2FA, reset password), and hides
//  it once signed in so it isn't rendered behind the authenticated app.
const ConditionalVideoBackground: React.FC = () => {
  const { currentUser } = useAuth();
  return currentUser ? null : <VideoBackground />;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
  <ThemeProvider>
    {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <LicenseProvider>
        <AuthProvider>
          <ConditionalVideoBackground />
          <BrowserRouter>
                    <Routes>
                      {/*  PUBLIC ROUTES */}
                      <Route
                        path="/login"
                        element={<PublicRoute element={<Login />} />}
                      />
                      <Route
                        path="/register"
                        element={<PublicRoute element={<Register />} />}
                      />

                      {/*  ALLOW EVEN WHEN LOGGED IN — mid-auth challenge screens
                          and the TOTP/recovery-code password reset flow */}
                      <Route
                        path="/login/verify"
                        element={
                          <PublicRoute
                            element={<LoginTwoFactorChallenge />}
                            allowWhenAuth
                          />
                        }
                      />
                      <Route
                        path="/login/setup-2fa"
                        element={
                          <PublicRoute
                            element={<TwoFactorSetupRequired />}
                            allowWhenAuth
                          />
                        }
                      />
                      <Route
                        path="/reset-password"
                        element={
                          <PublicRoute
                            element={<ResetPasswordTwoFactor />}
                            allowWhenAuth
                          />
                        }
                      />

                      {/*  PUBLIC SHARE ROUTE — no auth required */}
                      <Route path="/share/:token" element={<PublicShare />} />

                      {/*  LICENSE ROUTES */}
                      <Route
                        path="/activate-license"
                        element={<LicenseActivation />}
                      />
                      <Route path="/license-debug" element={<LicenseDebug />} />

                      {/*  PROTECTED ROUTES */}
                      <Route
                        path="/"
                        element={<ProtectedRoute element={<Dashboard />} />}
                      />
                      <Route
                        path="/documents"
                        element={<ProtectedRoute element={<DocumentList />} />}
                      />
                      <Route
                        path="/documents/browse"
                        element={<ProtectedRoute element={<DocumentBrowser />} />}
                      />
                      <Route
                        path="/documents/new"
                        element={
                          <ProtectedRoute element={<DocumentUpload />} />
                        }
                      />
                      <Route
                        path="/documents/:documentId"
                        element={<ProtectedRoute element={<DocumentView />} />}
                      />
                      <Route
                        path="/documents/:documentId/permissions"
                        element={
                          <ProtectedRoute element={<PermissionsManagement />} />
                        }
                      />
                      <Route
                        path="/documents/:documentId/share"
                        element={<ProtectedRoute element={<DocumentShare />} />}
                      />
                      <Route
                        path="/folders/:folderId"
                        element={<ProtectedRoute element={<FolderView />} />}
                      />
                      <Route
                        path="/recent"
                        element={
                          <ProtectedRoute element={<RecentDocuments />} />
                        }
                      />
                      <Route
                        path="/starred"
                        element={
                          <ProtectedRoute element={<StarredDocuments />} />
                        }
                      />
                      <Route
                        path="/profile"
                        element={<ProtectedRoute element={<Profile />} />}
                      />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/settings/change-password"
                        element={
                          <ProtectedRoute element={<ChangePassword />} />
                        }
                      />
                      <Route
                        path="/settings/two-factor"
                        element={<ProtectedRoute element={<TwoFactorAuth />} />}
                      />
                      <Route
                        path="/tags/:tagId"
                        element={<ProtectedRoute element={<TagView />} />}
                      />
                      <Route
                        path="/tags"
                        element={<ProtectedRoute element={<TagsManagement />} />}
                      />
                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute element={<UserManagement />} />
                        }
                      />
                      <Route
                        path="/admin/licenses"
                        element={
                          <ProtectedRoute element={<LicenseManagement />} />
                        }
                      />
                      <Route
                        path="/trash"
                        element={<ProtectedRoute element={<TrashPage />} />}
                      />
                      <Route
                        path="/audit"
                        element={<ProtectedRoute element={<AuditLog />} />}
                      />
                      <Route
                        path="/reports"
                        element={<ProtectedRoute element={<Reports />} />}
                      />
                      <Route
                        path="/search"
                        element={<ProtectedRoute element={<Search />} />}
                      />
                      <Route
                        path="/review-queue"
                        element={<ProtectedRoute element={<ReviewQueue />} />}
                      />
                      <Route
                        path="/collaborators"
                        element={<ProtectedRoute element={<Collaborators />} />}
                      />
                      <Route
                        path="/documents/shared"
                        element={<ProtectedRoute element={<SharedWithMe />} />}
                      />
                      <Route
                        path="/share-links"
                        element={<ProtectedRoute element={<MyShareLinks />} />}
                      />
                      <Route
                        path="/chat"
                        element={<ProtectedRoute element={<Chat />} />}
                      />
                    </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LicenseProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
