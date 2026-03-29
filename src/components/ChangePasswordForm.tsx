import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ChangePasswordForm = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): string | null => {
    if (!currentPassword) return "Please enter your current password.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (!/[A-Z]/.test(newPassword)) return "New password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(newPassword)) return "New password must contain at least one number.";
    if (newPassword !== confirmPassword) return "New passwords do not match.";
    if (newPassword === currentPassword) return "New password must be different from current password.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { toast({ title: "Validation Error", description: error, variant: "destructive" }); return; }

    setSaving(true);
    try {
      // Re-authenticate with current password to verify it
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({ title: "Password changed!", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const strength = (() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current password */}
      <div className="space-y-2">
        <Label htmlFor="cp-current">Current Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            id="cp-current"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="pl-9 pr-10"
            placeholder="Enter current password"
            required
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="space-y-2">
        <Label htmlFor="cp-new">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            id="cp-new"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-9 pr-10"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            required
          />
          <button type="button" onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {strength && (
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
            </div>
            <p className={`text-xs font-medium ${strength.color.replace("bg-", "text-")}`}>{strength.label}</p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-2">
        <Label htmlFor="cp-confirm">Confirm New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            id="cp-confirm"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`pl-9 pr-10 ${confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            placeholder="Repeat new password"
            required
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-xs text-red-500">Passwords do not match.</p>
        )}
      </div>

      <Button type="submit" disabled={saving} className="w-full bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
        {saving ? "Changing Password..." : "Change Password"}
      </Button>
    </form>
  );
};
