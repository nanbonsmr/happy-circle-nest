import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Users,
  ShieldCheck, ShieldAlert, Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExamBlockEditor, newBlock, type ExamBlock } from "@/components/ExamBlockEditor";
import { parseSeed, seededShuffle, shuffleOptions } from "@/lib/seededShuffle";

const steps = ["Exam Details", "Add Questions", "Review & Publish"];

const CreateExam = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId?: string }>();
  const isEditing = !!examId;
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingExam, setLoadingExam] = useState(isEditing);

  // Step 1
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("30");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [accessCode, setAccessCode] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const [securityLevel, setSecurityLevel] = useState<"low" | "high">("low");
  const [randomSeed, setRandomSeed] = useState("");

  // Step 2 — block-based editor
  const [blocks, setBlocks] = useState<ExamBlock[]>([newBlock()]);

  // Check auth + load exam if editing
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
    });
  }, [navigate]);

  // Load existing exam data when editing a cloned exam
  useEffect(() => {
    if (!examId) return;
    const loadExam = async () => {
      try {
        const { data: exam } = await supabase.from("exams").select("*").eq("id", examId).single();
        if (!exam) { navigate("/teacher"); return; }

        setTitle(exam.title);
        setSubject(exam.subject || "");
        setDuration(String(exam.duration_minutes));
        setMaxParticipants(exam.max_participants ? String(exam.max_participants) : "");
        setAccessCode(exam.access_code);
        setSecurityLevel(((exam as any).security_level as "low" | "high") || "low");

        // Load questions and rebuild blocks
        const { data: qs } = await supabase
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, question_order, block_id, block_order, instructions, paragraph, image_url, image_caption")
          .eq("exam_id", examId)
          .order("question_order");

        if (qs?.length) {
          // Group questions by block_id, preserving block_order for sorting
          const blockMap = new Map<string, { blockOrder: number; questions: any[] }>();
          qs.forEach((q: any) => {
            const bid = q.block_id || "default";
            if (!blockMap.has(bid)) {
              blockMap.set(bid, { blockOrder: q.block_order ?? 0, questions: [] });
            }
            blockMap.get(bid)!.questions.push(q);
          });

          // Sort blocks by block_order
          const sortedBlocks = Array.from(blockMap.entries())
            .sort((a, b) => a[1].blockOrder - b[1].blockOrder);

          const rebuiltBlocks: ExamBlock[] = sortedBlocks.map(([bid, { questions: bqs }], idx) => {
            const first = bqs[0] as any;
            return {
              id: bid === "default" ? `block-${idx}-${Date.now()}` : bid,
              instructions: first.instructions || "",
              paragraph: first.paragraph || "",
              imageUrl: first.image_url || "",
              imageCaption: first.image_caption || "",
              questions: bqs.map((q: any, qi: number) => ({
                id: `q-${idx}-${qi}-${Date.now()}`,
                text: q.question_text || "",
                options: [
                  q.option_a || "",
                  q.option_b || "",
                  q.option_c || "",
                  q.option_d || "",
                ],
                correctAnswer: q.correct_answer || "",
              })),
            };
          });
          setBlocks(rebuiltBlocks);
        }
      } catch (err) {
        console.error("Failed to load exam:", err);
        toast({ title: "Failed to load exam", variant: "destructive" });
        navigate("/teacher");
      }
      setLoadingExam(false);
    };
    loadExam();
  }, [examId, navigate, toast]);

  const generateUniqueCode = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${ts}-${rand}`.slice(0, 10);
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!title.trim()) throw new Error("Exam title is required");

      // Validate all blocks have at least one question with text
      const allQuestions = blocks.flatMap((b) => b.questions);
      if (allQuestions.length === 0) throw new Error("Add at least one question");
      if (allQuestions.some((q) => !q.text.trim())) throw new Error("All questions must have text");
      if (allQuestions.some((q) => !q.correctAnswer)) throw new Error("All questions must have a correct answer");
      if (allQuestions.some((q) => q.options.some((o) => !o.trim()))) throw new Error("All options must be filled");

      let code = accessCode;
      const { data: existing } = await supabase.from("exams").select("id").eq("access_code", code).maybeSingle();
      // Only generate new code if it conflicts with a DIFFERENT exam
      if (existing && existing.id !== examId) { code = generateUniqueCode(); setAccessCode(code); }

      const insertPayload: Record<string, any> = {
        teacher_id: user.id,
        title: title.trim(),
        subject: subject.trim(),
        duration_minutes: parseInt(duration) || 30,
        access_code: code,
        status: "published",
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        security_level: securityLevel,
      };

      let exam: any = null;
      let examError: any = null;

      if (isEditing && examId) {
        // Update existing exam
        const { data, error } = await supabase.from("exams")
          .update({ ...insertPayload, teacher_id: undefined } as any)
          .eq("id", examId).select().single();
        exam = data; examError = error;
        // Delete old questions before reinserting
        if (!examError) await supabase.from("questions").delete().eq("exam_id", examId);
      } else {
        const result = await supabase.from("exams").insert(insertPayload as any).select().single();
        exam = result.data; examError = result.error;
        if (examError && examError.message?.includes("security_level")) {
          const { security_level: _sl, ...payloadWithout } = insertPayload;
          const retry = await supabase.from("exams").insert(payloadWithout as any).select().single();
          exam = retry.data; examError = retry.error;
        }
      }
      if (examError) throw examError;

      // Flatten blocks into questions rows, applying seed-based shuffle if provided
      let globalOrder = 0;
      const questionsToInsert: any[] = [];
      const seed = parseSeed(randomSeed);
      const hasSeed = seed !== null;

      // Shuffle question order across all blocks if seed provided
      let allBlockQuestions: { block: ExamBlock; qi: number; bi: number }[] = [];
      blocks.forEach((block, bi) => {
        block.questions.forEach((_, qi) => {
          allBlockQuestions.push({ block, qi, bi });
        });
      });
      if (hasSeed) {
        allBlockQuestions = seededShuffle(allBlockQuestions, seed!);
      }

      allBlockQuestions.forEach(({ block, qi, bi }) => {
        const q = block.questions[qi];
        let optA = q.options[0].trim();
        let optB = q.options[1].trim();
        let optC = q.options[2].trim();
        let optD = q.options[3].trim();
        let correctAnswer = q.correctAnswer;

        // Shuffle answer options if seed provided
        if (hasSeed) {
          const opts = [
            { key: "A", text: optA },
            { key: "B", text: optB },
            { key: "C", text: optC },
            { key: "D", text: optD },
          ];
          // Use a per-question seed derived from main seed + question index
          const { shuffled, newCorrectKey } = shuffleOptions(opts, correctAnswer, seed! + globalOrder);
          optA = shuffled[0].text;
          optB = shuffled[1].text;
          optC = shuffled[2].text;
          optD = shuffled[3].text;
          correctAnswer = newCorrectKey;
        }

        questionsToInsert.push({
          exam_id: exam.id,
          question_text: q.text.trim(),
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: correctAnswer,
          marks: 1,
          question_order: globalOrder++,
          block_id: block.id,
          block_order: bi,
          instructions: qi === 0 ? block.instructions || null : null,
          paragraph: qi === 0 ? block.paragraph || null : null,
          image_url: qi === 0 ? block.imageUrl || null : null,
          image_caption: qi === 0 ? block.imageCaption || null : null,
        });
      });

      const { error: qError } = await supabase.from("questions").insert(questionsToInsert);
      if (qError) throw qError;

      toast({ title: isEditing ? "Exam Updated!" : "Exam Published!", description: "Students can now access the exam using the link." });
      navigate("/teacher");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const examLink = `https://nejoexamprep.vercel.app/exam/${accessCode}`;

  if (loadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/teacher"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-semibold">{isEditing ? "Edit Exam" : "Create Exam"}</h1>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i <= step ? "gradient-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-2 font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-16 md:w-24 h-0.5 mx-2 mt-[-16px] ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
                <CardDescription>Set up the basic information for your exam</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Exam Title</Label>
                  <Input placeholder="e.g. Mathematics Mid-term" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Max Students
                    </Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Access Code</Label>
                    <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">📊 Scoring: Percentage-based</p>
                  <p>Each question carries equal weight. Final score = (correct answers / total questions) × 100%</p>
                </div>

                {/* Security Level */}
                <div className="space-y-2">
                  <Label>Security Level</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSecurityLevel("low")}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                        securityLevel === "low"
                          ? "border-green-500 bg-green-50"
                          : "border-border hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${securityLevel === "low" ? "text-green-600" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">Standard</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Fullscreen + tab detection. Good for quizzes.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecurityLevel("high")}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                        securityLevel === "high"
                          ? "border-red-500 bg-red-50"
                          : "border-border hover:border-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={`h-4 w-4 ${securityLevel === "high" ? "text-red-600" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">High Security</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Blocks copy/paste, shortcuts & right-click.</p>
                    </button>
                  </div>
                </div>

                {/* Randomization Seed */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Shuffle className="h-3.5 w-3.5" /> Randomization Seed (optional)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1234 — leave empty for no shuffle"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(e.target.value)}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter any number to shuffle question order and answer choices. Same seed = same shuffle every time.
                  </p>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-sm text-muted-foreground mb-4">
              Build your exam using sections. Each section can have instructions, a reading passage, an image, and multiple questions.
            </p>
            {/* key forces full remount when editing so all fields populate correctly */}
            <ExamBlockEditor
              key={isEditing ? `edit-${examId}` : "create"}
              blocks={blocks}
              onChange={setBlocks}
            />
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle>Review & Publish</CardTitle>
                <CardDescription>Review your exam before publishing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Title:</span> <strong>{title || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Subject:</span> <strong>{subject || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Duration:</span> <strong>{duration} min</strong></div>
                  <div><span className="text-muted-foreground">Questions:</span> <strong>{blocks.flatMap(b => b.questions).length} across {blocks.length} section{blocks.length !== 1 ? "s" : ""}</strong></div>
                  <div><span className="text-muted-foreground">Max Students:</span> <strong>{maxParticipants || "Unlimited"}</strong></div>
                  <div><span className="text-muted-foreground">Scoring:</span> <strong>Percentage (%)</strong></div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-muted-foreground">Security:</span>
                    <strong className={`flex items-center gap-1 ${securityLevel === "high" ? "text-red-600" : "text-green-700"}`}>
                      {securityLevel === "high" ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {securityLevel === "high" ? "High Security" : "Standard"}
                    </strong>
                  </div>
                  <div className="col-span-2"><span className="text-muted-foreground">Access Code:</span> <strong className="font-mono">{accessCode}</strong></div>
                  {randomSeed.trim() && (
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-muted-foreground">Randomization Seed:</span>
                      <strong className="flex items-center gap-1 text-purple-600">
                        <Shuffle className="h-3.5 w-3.5" /> {randomSeed}
                      </strong>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-xl">
              <CardHeader><CardTitle className="text-base">Share Exam Link</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input value={examLink} readOnly className="font-mono text-sm bg-muted" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(examLink); toast({ title: "Copied!" }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={examLink} target="_blank" rel="noreferrer" title="Open exam link"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Questions preview */}
            <Card className="border-border/50 shadow-xl">
              <CardHeader><CardTitle className="text-base">Sections Preview</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {blocks.map((block, bi) => (
                  <div key={block.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-[#1e3a5f] text-white text-xs font-semibold">
                      Section {bi + 1} — {block.questions.length} question{block.questions.length !== 1 ? "s" : ""}
                    </div>
                    <div className="p-3 space-y-2">
                      {block.instructions && (
                        <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
                          📌 {block.instructions.slice(0, 80)}{block.instructions.length > 80 ? "…" : ""}
                        </div>
                      )}
                      {block.paragraph && (
                        <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800">
                          📄 {block.paragraph.slice(0, 80)}{block.paragraph.length > 80 ? "…" : ""}
                        </div>
                      )}
                      {block.imageUrl && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          🖼️ Image attached{block.imageCaption ? `: ${block.imageCaption}` : ""}
                        </div>
                      )}
                      {block.questions.map((q, qi) => (
                        <div key={q.id} className="text-sm bg-slate-50 rounded-lg p-2">
                          <p className="font-medium text-slate-700">{qi + 1}. {q.text || "—"}</p>
                          <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-slate-500">
                            {q.options.map((o, oi) => (
                              <span key={oi} className={q.correctAnswer === String.fromCharCode(65 + oi) ? "text-green-600 font-semibold" : ""}>
                                {String.fromCharCode(65 + oi)}. {o || "—"}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
              {saving ? (isEditing ? "Saving..." : "Publishing...") : <><Check className="h-4 w-4" /> {isEditing ? "Save Changes" : "Publish Exam"}</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateExam;
