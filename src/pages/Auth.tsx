import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      } else {
        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Try logging in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Please complete your profile.");
          navigate("/complete-profile");
        }
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              hsl(var(--foreground)) 20px,
              hsl(var(--foreground)) 22px
            )`,
          }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-secondary border-3 border-foreground p-3 shadow-neu mb-4">
            <span className="text-3xl">🛒</span>
            <span className="text-2xl font-bold uppercase">Hostel Mart</span>
          </div>
          <p className="text-muted-foreground font-medium">
            {isLogin ? "Welcome back, night owl!" : "Join the late-night squad"}
          </p>
        </div>

        {/* Form Card */}
        <div className="neu-card bg-card p-6 md:p-8">
          <h1 className="text-2xl font-bold uppercase mb-6 text-center">
            {isLogin ? "Login" : "Sign Up"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Your Name"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@college.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {isLogin && (
                <div className="flex justify-end mt-1">
                  <a
                    href="/forgot-password"
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="neu-btn bg-primary text-primary-foreground w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <>
                  {isLogin ? "Login" : "Create Account"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>Don't have an account? <span className="text-primary font-bold">Sign Up</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-bold">Login</span></>
              )}
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
