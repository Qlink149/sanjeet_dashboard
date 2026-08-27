import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { loginAPI } from "@/utils/apiUtils";
import { useAuth } from "@/context/auth-context";
import { useNavigate } from "react-router-dom";

export function LoginForm({ className, ...props }) {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); // ✅ prevent reload
    setLoading(true);
    setError("");

    try {
      const res = await loginAPI(empId, password);

      if (res?.success) {
        login();
        navigate("/");
      } else if (res?.timedOut) {
        setError("Could not reach the API. Try again.");
      } else {
        setError(res?.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Could not reach the API. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <img src="/ClaraFavicon.svg" alt="" className="w-12 h-12 my-3" />
          <h1 className="text-2xl font-semibold">Sanjeet</h1>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <Field>
          <FieldLabel>Username</FieldLabel>
          <Input
            placeholder="Enter username"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Field>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 w-full"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
