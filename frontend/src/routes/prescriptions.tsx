import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ClipboardList, FileText, CheckCircle, X, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AppNavbar } from "@/components/AppNavbar";
import { getAuthToken, getStoredUser, API_BASE_URL, authHeaders } from "@/lib/auth";

type ExtractedMed = {
  name: string;
  strength?: string;
  dosage_timing?: string;
  duration_days?: number;
  before_meal?: boolean;
  notes?: string;
};

export const Route = createFileRoute("/prescriptions")({
  head: () => ({
    meta: [
      { title: "Prescriptions — WellCare AI" },
      {
        name: "description",
        content:
          "Upload prescriptions and let WellCare AI extract dosage, timing and meal preferences automatically.",
      },
      { property: "og:title", content: "Prescriptions — WellCare AI" },
      {
        property: "og:description",
        content: "Snap a prescription, get a clean medication plan in seconds.",
      },
    ],
  }),
  component: PrescriptionsPage,
});

function PrescriptionsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMed[] | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      toast.error("Please sign in to view prescriptions");
      navigate({ to: "/login" });
      return;
    }

    const user = getStoredUser();

    if (user && user.role && user.role !== "patient") {
      toast.error("Prescriptions are available for patient accounts only");
      navigate({ to: "/dashboard" });
      return;
    }

    setAuthChecked(true);
  }, [navigate]);

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getAuthToken();

      const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Upload failed");
      }

      setPrescriptionId(data.prescription_id);
      setExtracted(data.extracted_medicines);

      toast.success("Medicines extracted! Please review and confirm.");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extracted || !prescriptionId) return;

    setConfirming(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/confirm`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          prescription_id: prescriptionId,
          medicines: extracted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Confirm failed");
      }

      toast.success(`${data.saved_count} medicines saved to your profile!`);

      setExtracted(null);
      setPrescriptionId(null);

      navigate({ to: "/medications" });
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Could not save medicines.");
    } finally {
      setConfirming(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-24">
      <Toaster position="top-center" richColors />
      <AppNavbar notificationCount={2} />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="container-page pt-6 md:pt-10"
      >
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">
              Prescriptions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Snap a prescription — we'll extract everything for you
            </p>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  handleUpload(file);
                }

                e.target.value = "";
              }}
            />

            <Button
              disabled={uploading}
              className="h-10 gap-2 rounded-xl bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground shadow-cta hover:opacity-95 md:h-11 md:px-5"
              asChild
            >
              <span>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

                <span className="hidden sm:inline">{uploading ? "Extracting..." : "Upload"}</span>
              </span>
            </Button>
          </label>
        </div>

        {!extracted && (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border/70 bg-background p-10 text-center shadow-sm md:p-14">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta">
              <ClipboardList className="h-6 w-6" />
            </div>

            <h3 className="font-display text-xl font-bold md:text-2xl">No prescriptions yet</h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Upload your first prescription and our AI will pull out medicines, dosages, timing and
              meal preferences automatically.
            </p>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <FileText className="h-3.5 w-3.5" />
              OCR powered by WellCare AI
            </div>
          </div>
        )}

        {extracted && (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h3 className="mb-1 font-display text-lg font-bold">Review Extracted Medicines</h3>

            <p className="mb-4 text-sm text-muted-foreground">
              Check the details below. Remove any incorrect entries, then confirm.
            </p>

            <div className="space-y-3">
              {extracted.map((med, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between rounded-xl border border-border/60 bg-mist p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{med.name}</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {med.strength && `${med.strength} · `}
                      {med.dosage_timing && `${med.dosage_timing} · `}
                      {med.before_meal ? "Before meal" : "After meal"}
                      {med.duration_days && ` · ${med.duration_days} days`}
                    </p>

                    {med.notes && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{med.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setExtracted(extracted.filter((_, j) => j !== i))}
                    className="ml-2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {extracted.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                All medicines removed. Upload again or discard.
              </p>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={confirming || extracted.length === 0}
                className="flex-1 gap-2 rounded-xl bg-gradient-primary font-semibold"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm & Save
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setExtracted(null);
                  setPrescriptionId(null);
                }}
                className="rounded-xl"
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </motion.main>
    </div>
  );
}
