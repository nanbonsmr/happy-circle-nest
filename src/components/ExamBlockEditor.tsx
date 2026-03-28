import { useState } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon,
  BookOpen, Info, X, Bold, Italic, Underline, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface BlockQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

export interface ExamBlock {
  id: string;
  instructions: string;
  paragraph: string;
  imageUrl: string;
  imageCaption: string;
  questions: BlockQuestion[];
}

interface Props {
  blocks: ExamBlock[];
  onChange: (blocks: ExamBlock[]) => void;
}

const newQuestion = (): BlockQuestion => ({
  id: String(Date.now() + Math.random()),
  text: "",
  options: ["", "", "", ""],
  correctAnswer: "",
});

const newBlock = (): ExamBlock => ({
  id: String(Date.now() + Math.random()),
  instructions: "",
  paragraph: "",
  imageUrl: "",
  imageCaption: "",
  questions: [newQuestion()],
});

// Minimal inline rich-text toolbar (applies markdown-style tags to textarea)
const RichToolbar = ({ onFormat }: { onFormat: (tag: string) => void }) => (
  <div className="flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded-t-lg border-b-0">
    <button type="button" onClick={() => onFormat("bold")}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Bold">
      <Bold className="h-3.5 w-3.5" />
    </button>
    <button type="button" onClick={() => onFormat("italic")}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Italic">
      <Italic className="h-3.5 w-3.5" />
    </button>
    <button type="button" onClick={() => onFormat("underline")}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Underline">
      <Underline className="h-3.5 w-3.5" />
    </button>
    <div className="w-px h-4 bg-slate-300 mx-1" />
    <button type="button" onClick={() => onFormat("bullet")}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Bullet list">
      <List className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const ExamBlockEditor = ({ blocks, onChange }: Props) => {
  const [imageModal, setImageModal] = useState<{ blockId: string } | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempCaption, setTempCaption] = useState("");

  const updateBlock = (id: string, patch: Partial<ExamBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    if (blocks.length > 1) onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx + dir < 0 || idx + dir >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onChange(next);
  };

  const addQuestion = (blockId: string) => {
    onChange(blocks.map((b) =>
      b.id === blockId ? { ...b, questions: [...b.questions, newQuestion()] } : b
    ));
  };

  const removeQuestion = (blockId: string, qId: string) => {
    onChange(blocks.map((b) =>
      b.id === blockId
        ? { ...b, questions: b.questions.length > 1 ? b.questions.filter((q) => q.id !== qId) : b.questions }
        : b
    ));
  };

  const updateQuestion = (blockId: string, qId: string, patch: Partial<BlockQuestion>) => {
    onChange(blocks.map((b) =>
      b.id === blockId
        ? { ...b, questions: b.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)) }
        : b
    ));
  };

  const updateOption = (blockId: string, qId: string, optIdx: number, val: string) => {
    onChange(blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            questions: b.questions.map((q) =>
              q.id === qId
                ? { ...q, options: q.options.map((o, i) => (i === optIdx ? val : o)) }
                : q
            ),
          }
        : b
    ));
  };

  const applyFormat = (blockId: string, field: "instructions" | "paragraph", tag: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const current = block[field];
    let insert = "";
    if (tag === "bold") insert = "**bold text**";
    else if (tag === "italic") insert = "_italic text_";
    else if (tag === "underline") insert = "__underlined__";
    else if (tag === "bullet") insert = "\n• item";
    updateBlock(blockId, { [field]: current + insert });
  };

  const openImageModal = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    setTempImageUrl(block?.imageUrl || "");
    setTempCaption(block?.imageCaption || "");
    setImageModal({ blockId });
  };

  const saveImage = () => {
    if (!imageModal) return;
    updateBlock(imageModal.blockId, { imageUrl: tempImageUrl, imageCaption: tempCaption });
    setImageModal(null);
  };

  return (
    <div className="space-y-6">
      {blocks.map((block, bi) => (
        <div key={block.id} className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Block header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1e3a5f] text-white">
            <span className="text-sm font-semibold">Section {bi + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={bi === 0}
                title="Move section up"
                className="p-1 rounded hover:bg-white/20 disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={bi === blocks.length - 1}
                title="Move section down"
                className="p-1 rounded hover:bg-white/20 disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => removeBlock(block.id)} disabled={blocks.length <= 1}
                title="Remove section"
                className="p-1 rounded hover:bg-red-400/40 disabled:opacity-30 ml-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Instructions */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Instructions</span>
                <span className="text-xs text-amber-500 ml-auto">Optional — shown to students above questions</span>
              </div>
              <RichToolbar onFormat={(tag) => applyFormat(block.id, "instructions", tag)} />
              <Textarea
                placeholder='e.g. "Read the passage carefully before answering the questions below."'
                value={block.instructions}
                onChange={(e) => updateBlock(block.id, { instructions: e.target.value })}
                className="border-0 rounded-none rounded-b-xl bg-amber-50 text-sm min-h-[70px] focus-visible:ring-0 resize-none"
              />
            </div>

            {/* Paragraph */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border-b border-blue-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Reading Passage / Context</span>
                <span className="text-xs text-blue-400 ml-auto">Optional</span>
              </div>
              <RichToolbar onFormat={(tag) => applyFormat(block.id, "paragraph", tag)} />
              <Textarea
                placeholder="Enter a reading passage, scenario, or case study..."
                value={block.paragraph}
                onChange={(e) => updateBlock(block.id, { paragraph: e.target.value })}
                className="border-0 rounded-none rounded-b-xl bg-blue-50 text-sm min-h-[100px] focus-visible:ring-0 resize-none"
              />
            </div>

            {/* Image */}
            <div>
              {block.imageUrl ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-600">Image</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openImageModal(block.id)}
                        className="text-xs text-blue-600 hover:underline px-2">Edit</button>
                      <button type="button" onClick={() => updateBlock(block.id, { imageUrl: "", imageCaption: "" })}
                        className="text-xs text-red-500 hover:underline px-2">Remove</button>
                    </div>
                  </div>
                  <div className="p-3">
                    <img src={block.imageUrl} alt={block.imageCaption || "Block image"}
                      className="w-full max-h-48 object-contain rounded-lg bg-slate-100" />
                    {block.imageCaption && (
                      <p className="text-xs text-slate-500 text-center mt-2 italic">{block.imageCaption}</p>
                    )}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => openImageModal(block.id)}
                  className="w-full flex items-center gap-2 justify-center py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f] transition-colors text-sm">
                  <ImageIcon className="h-4 w-4" />
                  Add Image (optional)
                </button>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Questions</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {block.questions.map((q, qi) => (
                <Card key={q.id} className="border-slate-200 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
                    <span className="text-sm font-semibold text-slate-600">Q{qi + 1}</span>
                    <button type="button" onClick={() => removeQuestion(block.id, q.id)}
                      disabled={block.questions.length <= 1}
                      title="Remove question"
                      className="text-red-400 hover:text-red-600 disabled:opacity-30">
                      <X className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <Input
                      placeholder="Enter question text"
                      value={q.text}
                      onChange={(e) => updateQuestion(block.id, q.id, { text: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="space-y-1">
                          <Label className="text-xs text-slate-500">Option {String.fromCharCode(65 + oi)}</Label>
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            value={opt}
                            onChange={(e) => updateOption(block.id, q.id, oi, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Correct Answer</Label>
                      <RadioGroup
                        value={q.correctAnswer}
                        onValueChange={(v) => updateQuestion(block.id, q.id, { correctAnswer: v })}
                        className="flex gap-4"
                      >
                        {["A", "B", "C", "D"].map((l) => (
                          <div key={l} className="flex items-center gap-1.5">
                            <RadioGroupItem value={l} id={`${q.id}-${l}`} />
                            <Label htmlFor={`${q.id}-${l}`} className="text-sm font-medium">{l}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <button type="button" onClick={() => addQuestion(block.id)}
                className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] transition-colors text-sm">
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add block */}
      <button type="button" onClick={() => onChange([...blocks, newBlock()])}
        className="w-full flex items-center gap-2 justify-center py-4 rounded-2xl border-2 border-dashed border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors font-medium">
        <Plus className="h-5 w-5" /> Add Section
      </button>

      {/* Image modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0f172a]">Add Image</h3>
              <button type="button" onClick={() => setImageModal(null)} title="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Image URL</Label>
                <Input
                  placeholder="https://example.com/image.png"
                  value={tempImageUrl}
                  onChange={(e) => setTempImageUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              {tempImageUrl && (
                <img src={tempImageUrl} alt="Preview"
                  className="w-full max-h-40 object-contain rounded-lg bg-slate-100 border border-slate-200" />
              )}
              <div>
                <Label className="text-sm">Caption (optional)</Label>
                <Input
                  placeholder="Figure 1: ..."
                  value={tempCaption}
                  onChange={(e) => setTempCaption(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button type="button" variant="outline" onClick={() => setImageModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="button" onClick={saveImage}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white border-0">
                Save Image
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { newBlock };
