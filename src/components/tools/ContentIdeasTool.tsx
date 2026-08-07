import React, { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  FileVideo, 
  Upload, 
  RefreshCw, 
  Sliders, 
  Hash, 
  MessageSquare, 
  Target, 
  Flame, 
  Camera, 
  Share2, 
  Layers, 
  Cpu, 
  Video, 
  Film, 
  ListFilter,
  Megaphone,
  Wand2,
  Clock,
  Scissors,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { saveHistoryItem } from '../../lib/history';
import { getAntiLimitHeaders } from '../../lib/antiLimit';
import { learningSync } from '../../lib/learningSync';
import { safeParseJson } from '../../lib/apiHelper';
import { useAccessGate } from '../../hooks/useAccessGate';
import { useGenerationLog } from '../../hooks/useGenerationLog';

interface ContentIdeasToolProps {
  initialVideoFile?: File | null;
  initialTikTokTitle?: string;
  initialTopic?: string;
  onSendToPhotoPrompt?: (text: string) => void;
  onSendToVideoPrompt?: (file: File) => void;
}

export interface IdeaClipSegment {
  id: number;
  timeRange: string;
  title: string;
  actionAndVO: string;
  aiPrompt: string;
}

export interface ParsedIdea {
  id: number;
  title: string;
  typeAndAngle: string;
  targetAudience: string;
  hook: string;
  visualAudioGuide: string;
  scenePrompts: string;
  clips: IdeaClipSegment[];
  caption: string;
  hashtags: string;
  fullRawText: string;
}

// Helper function to parse scenePrompts markdown block into individual timestamped clip objects
export const parseClipSegmentsFromScenePrompts = (text: string): IdeaClipSegment[] => {
  if (!text) return [];

  const clips: IdeaClipSegment[] = [];

  // Match pattern like: - **[00:00 - 00:05] Klip 1 (Hook)**: ...
  const clipRegex = /(?:^|\n)\s*-\s*\*\*\[(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})\]\s*([^\*:]+)\*\*:?([\s\S]*?)(?=(?:\n\s*-\s*\*\*\[\d{2}:\d{2}|$))/gi;

  let match;
  let index = 1;

  while ((match = clipRegex.exec(text)) !== null) {
    const timeRange = match[1].trim();
    const rawTitle = match[2].trim();
    const contentBlock = match[3].trim();

    // Extract Aksi & Dialog/VO
    let actionAndVO = '';
    const actMatch = contentBlock.match(/(?:\*Aksi & Dialog\/VO\*|\*Aksi & VO\*|\*Aksi\*):\s*([\s\S]*?)(?=(?:\n\s*-\s*\*Prompt AI Video\*|\n\s*-\s*\*Prompt|```|\[Style\]:|$))/i);
    if (actMatch) {
      actionAndVO = actMatch[1].trim().replace(/^\[|\]$/g, '');
    } else {
      // Fallback: take content before ``` or [Style]:
      const cutoffMatch = contentBlock.match(/^([\s\S]*?)(?=(?:```|\[Style\]:|\*Prompt AI Video\*))/i);
      actionAndVO = cutoffMatch ? cutoffMatch[1].trim() : contentBlock;
    }

    // Extract Prompt AI Video
    let aiPrompt = '';
    const codeMatch = contentBlock.match(/```(?:text)?\n?([\s\S]*?)```/i);
    if (codeMatch) {
      aiPrompt = codeMatch[1].trim();
    } else {
      const tagMatch = contentBlock.match(/(\[Style\]:[\s\S]*?)$/i);
      if (tagMatch) {
        aiPrompt = tagMatch[1].trim();
      } else {
        const promptMatch = contentBlock.match(/(?:\*Prompt AI Video\*|\*Prompt AI\*|\*Prompt\*):\s*([\s\S]*?)$/i);
        if (promptMatch) {
          aiPrompt = promptMatch[1].replace(/[`]/g, '').trim();
        }
      }
    }

    clips.push({
      id: index++,
      timeRange,
      title: rawTitle || `Klip ${index - 1}`,
      actionAndVO,
      aiPrompt,
    });
  }

  // Fallback parsing if non-standard list formatting
  if (clips.length === 0 && text.includes('Klip')) {
    const blocks = text.split(/(?=\n\s*-\s*\*+\[?0\d:|\n\s*-\s*\*+Klip)/gi).filter(Boolean);
    blocks.forEach((b, i) => {
      const timeMatch = b.match(/\[(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})\]/);
      const codeMatch = b.match(/```(?:text)?\n?([\s\S]*?)```/i);
      const actMatch = b.match(/(?:\*Aksi[^\*]*\*):\s*([^\n]+)/i);

      clips.push({
        id: i + 1,
        timeRange: timeMatch ? timeMatch[1] : `Segmen ${i + 1}`,
        title: `Klip ${i + 1}`,
        actionAndVO: actMatch ? actMatch[1].trim() : b.replace(/```[\s\S]*?```/g, '').replace(/[\*#]/g, '').trim(),
        aiPrompt: codeMatch ? codeMatch[1].trim() : '',
      });
    });
  }

  return clips;
};

export default function ContentIdeasTool({
  initialVideoFile,
  initialTikTokTitle,
  initialTopic,
  onSendToPhotoPrompt,
  onSendToVideoPrompt,
}: ContentIdeasToolProps) {
  const accessGate = useAccessGate();
  const { logGeneration } = useGenerationLog();

  const [file, setFile] = useState<File | null>(initialVideoFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tiktokTitle, setTiktokTitle] = useState<string>(initialTikTokTitle || '');
  const [topic, setTopic] = useState<string>(initialTopic || '');
  const [contentType, setContentType] = useState<string>('affiliate');
  const [tone, setTone] = useState<string>('persuasive');
  const [maxDuration, setMaxDuration] = useState<string>('60'); // 15 | 30 | 60 | 90 | 120
  const [segmentDuration, setSegmentDuration] = useState<string>('5'); // 5 | 8 | 10 | 15 | auto
  const [targetAI, setTargetAI] = useState<string>('general');

  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('Tahap 1: Menganalisis elemen visual asli video...');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModelUsed, setActiveModelUsed] = useState<string | null>(null);

  // Copy states
  const [copiedIdeaId, setCopiedIdeaId] = useState<number | null>(null);
  const [copiedHookId, setCopiedHookId] = useState<number | null>(null);
  const [copiedVisualId, setCopiedVisualId] = useState<number | null>(null);
  const [copiedCaptionId, setCopiedCaptionId] = useState<number | null>(null);
  const [copiedHashtagsId, setCopiedHashtagsId] = useState<number | null>(null);
  const [copiedScenesId, setCopiedScenesId] = useState<number | null>(null);
  const [copiedClipKey, setCopiedClipKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'raw'>('cards');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVideoFile) {
      setFile(initialVideoFile);
      const url = URL.createObjectURL(initialVideoFile);
      setPreviewUrl(url);
    }
  }, [initialVideoFile]);

  useEffect(() => {
    if (initialTikTokTitle) {
      setTiktokTitle(initialTikTokTitle);
    }
  }, [initialTikTokTitle]);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  // Restore cached ideas result on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('cached_ideas_result');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.result) {
          setRawResult(parsed.result);
          if (parsed.modelUsed) {
            setActiveModelUsed(parsed.modelUsed);
          }
        }
      }
    } catch (err) {
      console.error('Gagal membaca cache ide konten dari sessionStorage', err);
    }
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.type.startsWith('video/')) {
      setError('Mohon unggah file video yang valid.');
      return;
    }
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Gagal mengonversi file video'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerateIdeas = async () => {
    if (!accessGate.isAllowed('idea_konten')) {
      setError(accessGate.getReason('idea_konten') || 'Akses ditolak. Silakan perpanjang paket langganan Anda.');
      return;
    }

    if (!file && !tiktokTitle.trim() && !topic.trim()) {
      setError('Mohon unggah video, tempel judul TikTok, atau isi topik/produk.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgressPercent(10);
    setProgressStep('Tahap 1: Menganalisis objek, aksi & setting visual video...');

    const startTime = Date.now();
    let currPct = 10;
    const progressInterval = setInterval(() => {
      currPct += Math.floor(Math.random() * 6) + 3;
      if (currPct > 93) currPct = 93;
      setProgressPercent(currPct);

      if (currPct < 40) {
        setProgressStep('Tahap 1: Ekstraksi objek, aksi & setting visual video...');
      } else if (currPct < 80) {
        setProgressStep('Tahap 2: Meracik 5 Ide Konten Grounded & Dialog Natural Anti-AI-Slop...');
      } else {
        setProgressStep('Validasi: Cross-check & Verifikasi Konsistensi Visual...');
      }
    }, 600);

    try {
      let base64Data: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (file) {
        base64Data = await fileToBase64(file);
        mimeType = file.type;
      }

      const res = await fetch('/api/generate-content-ideas', {
        method: 'POST',
        headers: getAntiLimitHeaders(),
        body: JSON.stringify({
          mimeType,
          base64Data,
          sourceTitle: tiktokTitle,
          topic,
          contentType,
          tone,
          maxDuration,
          segmentDuration,
          targetAI,
        }),
      });

      const data = await safeParseJson(res);
      const latencyMs = Date.now() - startTime;

      clearInterval(progressInterval);
      setProgressPercent(100);
      setProgressStep('Selesai membuat 5 ide konten grounded!');

      setRawResult(data.result);
      setActiveModelUsed(data.modelUsed || 'Gemini Auto-Cascade');

      // Emit generation event to tracking pipeline
      logGeneration({
        tool: 'idea_konten',
        productName: topic || tiktokTitle || file?.name,
        topic: topic || tiktokTitle || file?.name,
        durationRequested: parseInt(maxDuration) || 60,
        segmentSplit: parseInt(segmentDuration) || 5,
        toneOfVoice: tone,
        contentSalesType: contentType,
        modelUsed: data.modelUsed || 'gemini-3.6-flash',
        latencyMs,
        outcome: 'success',
      });

      // Save to sessionStorage cache
      try {
        sessionStorage.setItem('cached_ideas_result', JSON.stringify({
          result: data.result,
          modelUsed: data.modelUsed || 'Gemini Auto-Cascade',
        }));
      } catch (err) {
        console.error('Gagal menyimpan cache ide konten ke sessionStorage', err);
      }

      // Track content ideas generated in auto-learning buffer
      learningSync.track('content_ideas_generated', {
        topic: topic || tiktokTitle || (file ? file.name : ''),
        contentType,
        tone,
        maxDuration,
        segmentDuration,
        targetAI,
      });

      // Save to history
      const displayTitle = file 
        ? `Ide Konten (${maxDuration}s): ${file.name}`
        : tiktokTitle 
          ? `Ide Konten TikTok (${maxDuration}s): ${tiktokTitle.slice(0, 35)}...`
          : `Ide Konten (${maxDuration}s): ${topic.slice(0, 35)}...`;

      saveHistoryItem({
        category: 'content_ideas',
        title: displayTitle,
        subtitle: `Durasi: ${maxDuration}s (Pecah ${segmentDuration}s) • Tipe: ${contentType.toUpperCase()}`,
        data: {
          prompt: data.result,
          contentIdeasResult: data.result,
          modelUsed: data.modelUsed || 'Gemini Auto-Cascade',
          contentType,
          tone,
          sourceText: topic || tiktokTitle || file?.name,
        },
      });
    } catch (err: any) {
      console.error(err);
      const latencyMs = Date.now() - startTime;
      const errMsg = err.message || 'Gagal menghasilkan ide konten.';
      setError(errMsg);

      logGeneration({
        tool: 'idea_konten',
        productName: topic || tiktokTitle || file?.name,
        topic: topic || tiktokTitle || file?.name,
        durationRequested: parseInt(maxDuration) || 60,
        segmentSplit: parseInt(segmentDuration) || 5,
        toneOfVoice: tone,
        contentSalesType: contentType,
        modelUsed: 'gemini-3.6-flash',
        latencyMs,
        outcome: 'error',
        errorMessage: errMsg,
      });
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  // Helper function to parse raw markdown output into 5 structured idea objects
  const parseIdeasFromMarkdown = (text: string): ParsedIdea[] => {
    if (!text) return [];

    const ideaBlocks = text.split(/### 💡 IDE /g).slice(1);
    
    if (ideaBlocks.length === 0) {
      return [];
    }

    return ideaBlocks.map((block, index) => {
      const id = index + 1;
      const lines = block.split('\n');
      const titleLine = lines[0] || `Ide Konten #${id}`;
      const cleanTitle = titleLine.replace(/^\d+:\s*/, '').replace(/[\*#]/g, '').trim();

      const getSection = (key: string): string => {
        const regex = new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      };

      // Extract Scene Prompts Block
      let scenePrompts = '';
      const sceneMatch = block.match(/\*\*Rincian Adegan Video & Prompt AI per Segmen[^\*]*\null*:\s*([\s\S]*?)(?=\n- \*\*Caption|\n- \*\*Hashtag|\n---|$)/i) ||
        block.match(/\*\*Rincian Adegan Video & Prompt AI per Segmen[^\*]*\*\*:\s*([\s\S]*?)(?=\n- \*\*Caption|\n- \*\*Hashtag|\n---|$)/i);
      if (sceneMatch) {
        scenePrompts = sceneMatch[1].trim();
      }

      const clips = parseClipSegmentsFromScenePrompts(scenePrompts);

      // Extract caption specifically from **Caption Relevan**: section
      let caption = '';
      const captionSectionMatch = block.match(/\*\*Caption Relevan\*\*:\s*([\s\S]*?)(?=\n- \*\*Hashtag|\n#|\n---|$)/i);
      if (captionSectionMatch) {
        const rawCaptionText = captionSectionMatch[1].trim();
        // Check if rawCaptionText is wrapped in ```text ... ``` or """text ... """
        const innerMatch = rawCaptionText.match(/(?:```(?:text)?|"""(?:text)?)\n?([\s\S]*?)\n?(?:```|"""|$)/i);
        if (innerMatch && innerMatch[1] && innerMatch[1].trim() && !innerMatch[1].includes('[Style]:')) {
          caption = innerMatch[1].trim();
        } else {
          caption = rawCaptionText
            .replace(/^(?:```(?:text)?|"""(?:text)?|text|\s)+|(?:```|"""|\s)+$/g, '')
            .replace(/^["'`\s]+|["'`\s]+$/g, '')
            .trim();
        }
      }

      // Extract Hashtags (Maximal 5 Hashtags)
      let hashtags = '';
      const lineMatch = block.match(/\*\*Hashtag Relevan\*\*:\s*([^\n]+)/i);
      if (lineMatch && lineMatch[1]) {
        hashtags = lineMatch[1].replace(/['"]/g, '').trim();
      } else {
        const hashTagsArray = block.match(/#[\w_]+/g);
        if (hashTagsArray) {
          hashtags = hashTagsArray.join(' ');
        }
      }

      // Enforce strict limit of maximum 5 hashtags and remove generic FYP tags
      if (hashtags) {
        const tagMatches: string[] = hashtags.match(/#[\w_]+/g) || [];
        const genericList = ['#fyp', '#fyptiktok', '#racuntiktok', '#viral', '#trending', '#foryou', '#foryoupage', '#beranda'];
        const filteredTags = tagMatches.filter((t: string) => !genericList.includes(t.toLowerCase()));
        const finalTags = filteredTags.length > 0 ? filteredTags : tagMatches;
        hashtags = finalTags.slice(0, 5).join(' ');
      }

      return {
        id,
        title: cleanTitle,
        typeAndAngle: getSection('Tipe & Angle Konten') || getSection('Angle Konten'),
        targetAudience: getSection('Target Audience') || getSection('Audiens'),
        hook: getSection('Hook Pikat \\(3 Detik Pertama\\)') || getSection('Hook Pikat') || getSection('Hook'),
        visualAudioGuide: getSection('Panduan Visual & Audio') || getSection('Visual & Audio'),
        scenePrompts,
        clips,
        caption,
        hashtags,
        fullRawText: `### 💡 IDE ${id}: ${cleanTitle}\n` + block,
      };
    });
  };

  const parsedIdeas = rawResult ? parseIdeasFromMarkdown(rawResult) : [];

  const copyClipOnly = (ideaId: number, clip: IdeaClipSegment) => {
    const textToCopy = clip.aiPrompt ? clip.aiPrompt.trim() : clip.actionAndVO.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopiedClipKey(`${ideaId}_${clip.id}`);

    learningSync.track('prompt_copied', {
      type: 'content_idea_clip_segment',
      ideaId,
      clipId: clip.id,
      text: textToCopy,
    });

    setTimeout(() => setCopiedClipKey(null), 2000);
  };

  const copyIdea = (idea: ParsedIdea) => {
    const textToCopy = `💡 ${idea.title.toUpperCase()}\n` +
      `🎯 Angle: ${idea.typeAndAngle}\n` +
      `🎣 Hook 3 Detik: ${idea.hook}\n\n` +
      (idea.scenePrompts ? `🎬 PROMPT ADEGAN PER SEGMEN:\n${idea.scenePrompts}\n\n` : '') +
      `📝 CAPTION:\n${idea.caption}\n\n` +
      `#️⃣ HASHTAGS:\n${idea.hashtags}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedIdeaId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_full',
      ideaId: idea.id,
      text: textToCopy,
    });

    setTimeout(() => setCopiedIdeaId(null), 2000);
  };

  const copyHookOnly = (idea: ParsedIdea) => {
    navigator.clipboard.writeText(idea.hook);
    setCopiedHookId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_hook',
      ideaId: idea.id,
      text: idea.hook,
    });

    setTimeout(() => setCopiedHookId(null), 2000);
  };

  const copyVisualOnly = (idea: ParsedIdea) => {
    navigator.clipboard.writeText(idea.visualAudioGuide);
    setCopiedVisualId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_visual',
      ideaId: idea.id,
      text: idea.visualAudioGuide,
    });

    setTimeout(() => setCopiedVisualId(null), 2000);
  };

  const copyCaptionOnly = (idea: ParsedIdea) => {
    navigator.clipboard.writeText(idea.caption);
    setCopiedCaptionId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_caption',
      ideaId: idea.id,
      text: idea.caption,
    });

    setTimeout(() => setCopiedCaptionId(null), 2000);
  };

  const copyHashtagsOnly = (idea: ParsedIdea) => {
    navigator.clipboard.writeText(idea.hashtags);
    setCopiedHashtagsId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_hashtags',
      ideaId: idea.id,
      text: idea.hashtags,
    });

    setTimeout(() => setCopiedHashtagsId(null), 2000);
  };

  const copyScenesOnly = (idea: ParsedIdea) => {
    navigator.clipboard.writeText(idea.scenePrompts);
    setCopiedScenesId(idea.id);

    learningSync.track('prompt_copied', {
      type: 'content_idea_scenes',
      ideaId: idea.id,
      text: idea.scenePrompts,
    });

    setTimeout(() => setCopiedScenesId(null), 2000);
  };

  const downloadIdeaAsTxt = (idea: ParsedIdea) => {
    const textContent = `IDE KONTEN TIKTOK #${idea.id}: ${idea.title.toUpperCase()}\n` +
      `==========================================\n\n` +
      `🎯 TIPE & ANGLE: ${idea.typeAndAngle}\n` +
      `📣 TARGET AUDIENS: ${idea.targetAudience}\n\n` +
      `🔥 HOOK (3 DETIK PERTAMA):\n${idea.hook}\n\n` +
      `🎬 PANDUAN VISUAL & AUDIO:\n${idea.visualAudioGuide}\n\n` +
      `✂️ RINCIAN ADEGAN & PROMPT AI PER SEGMEN (${maxDuration}s):\n${idea.scenePrompts}\n\n` +
      `📝 CAPTION RELEVAN PERSUASIF:\n${idea.caption}\n\n` +
      `#️⃣ HASHTAGS RELEVAN:\n${idea.hashtags}\n`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ide_Konten_${idea.id}_${idea.title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllIdeasAsTxt = () => {
    if (!rawResult) return;
    const blob = new Blob([rawResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `5_Ide_Konten_TikTok_Lengkap.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyAllIdeas = () => {
    if (rawResult) {
      navigator.clipboard.writeText(rawResult);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Input Form & Configuration Options */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Source Input Choice */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-500" />
              <span>Sumber Data / Video TikTok</span>
            </h3>
            <span className="text-xs text-slate-500">Analisis dari Video, Judul, atau Topik Produk</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Video Upload / Preview */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Unggah File Video (Opsional)
              </label>
              
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                    isDragging ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-amber-500 hover:bg-slate-100/80'
                  }`}
                >
                  <Upload className="w-6 h-6 text-amber-500 mb-2" />
                  <p className="text-xs font-bold text-slate-800">Klik / Tarik & Lepas Video di Sini</p>
                  <p className="text-[11px] text-slate-500 mt-1">MP4, MOV, WebM untuk analisis adegan visual AI</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept="video/*"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative">
                      <video src={previewUrl!} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }}
                    className="p-2 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors text-xs shrink-0 cursor-pointer"
                    title="Hapus Video"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: TikTok Title & Topic Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Judul / Caption Video TikTok
                </label>
                <input
                  type="text"
                  value={tiktokTitle}
                  onChange={(e) => setTiktokTitle(e.target.value)}
                  placeholder="Contoh: Rekomendasi blender portable mini bisa dicharge..."
                  className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#5b50e5] focus:ring-2 focus:ring-[#5b50e5]/20 focus:outline-none text-slate-900 text-xs placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Topik Utama / Nama Produk Afiliasi
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Sunscreen SPF 50 ringan tidak lengket untuk kulit berminyak..."
                  className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#5b50e5] focus:ring-2 focus:ring-[#5b50e5]/20 focus:outline-none text-slate-900 text-xs placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurations: Content Type & Tone */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Content Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#5b50e5]" />
              Tipe / Tujuan Konten
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 focus:border-[#5b50e5] text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              <option value="affiliate">Jualan Afiliasi / Soft Selling</option>
              <option value="review">Unboxing & Honest Review</option>
              <option value="tutorial">Problem-Solution & Tutorial</option>
              <option value="storytelling">Storytelling & Kurhat Relatable</option>
              <option value="entertainment">Komedi / Humor FYP</option>
            </select>
          </div>

          {/* Tone of Voice */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
              Tone Bahasa & Gaya Usul
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 focus:border-emerald-500 text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              <option value="persuasive">Persuasif & Penjualan Racun TikTok</option>
              <option value="casual">Santai, Kasual & Gaul (Gen-Z Style)</option>
              <option value="funny">Lucu, Humor & Menghibur</option>
              <option value="expert">Profesional, Edukatif & Terpercaya</option>
              <option value="dramatic">Bikin Penasaran & High Energy</option>
            </select>
          </div>
        </div>

        {/* Configurations Row 2: Duration & Segment Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Duration Selector (Up to 120s / 2 Minutes) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Total Durasi Konten (Max 2 Menit)
            </label>
            <select
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 focus:border-amber-500 text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              <option value="15">15 Detik (Short Video Express)</option>
              <option value="30">30 Detik (Standard FYP)</option>
              <option value="60">60 Detik / 1 Menit (Rekomendasi Utama)</option>
              <option value="90">90 Detik / 1.5 Menit (In-Depth Review)</option>
              <option value="120">120 Detik / 2 Menit (Maksimal Durasi)</option>
            </select>
          </div>

          {/* Segment Split Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-cyan-600" />
              Pecah Durasi Prompt per Segmen
            </label>
            <select
              value={segmentDuration}
              onChange={(e) => setSegmentDuration(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 focus:border-cyan-500 text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              <option value="5">Tiap 5 Detik per Klip</option>
              <option value="8">Tiap 8 Detik per Klip</option>
              <option value="10">Tiap 10 Detik per Klip</option>
              <option value="15">Tiap 15 Detik per Klip</option>
              <option value="auto">Pecah Otomatis Berdasarkan Adegan</option>
            </select>
          </div>
        </div>

        {/* Generate Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGenerateIdeas}
            disabled={isGenerating || (!file && !tiktokTitle.trim() && !topic.trim())}
            className="w-full h-13 sm:h-14 rounded-xl sm:rounded-2xl bg-[#5b50e5] hover:bg-[#4b40d5] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#5b50e5]/20 text-xs sm:text-sm group cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Meracik 5 Ide Konten, Pecah Prompt {maxDuration}s & Hashtag FYP...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Hasilkan 5 Ide Konten, Prompt Adegan ({maxDuration}s) & Hashtag Relevan</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs sm:text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </motion.div>
        )}
      </div>

      {/* Output Display Section */}
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 sm:p-12 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col items-center justify-center text-center space-y-5"
          >
            <div className="relative w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div className="space-y-2 w-full max-w-md">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Pipeline 2-Tahap: Menganalisis Video & Grounding</h3>
              <p className="text-amber-800 text-xs sm:text-sm font-semibold">
                {progressStep}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 border border-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 mt-3">
                <div 
                  className="bg-[#5b50e5] h-full rounded-full transition-all duration-500 shadow-2xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1 font-medium">
                <span>Tahap 1: Vision Grounding</span>
                <span>Tahap 2: 5 Ide + VO Natural</span>
              </div>
            </div>
          </motion.div>
        ) : rawResult ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Control Toolbar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>5 Ide Konten TikTok & Hashtag SIAP PAKAI</span>
                    {activeModelUsed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600 border border-slate-200">
                        {activeModelUsed}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">Pilih ide terbaik, salin prompt per segmen, caption & hashtag langsung untuk diposting</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {/* View Mode Toggle */}
                <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-xs font-semibold">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'cards' ? 'bg-[#5b50e5] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Kartu Per Ide</span>
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'raw' ? 'bg-[#5b50e5] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Markdown Lengkap</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={downloadAllIdeasAsTxt}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh semua ide sebagai file teks .txt"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Unduh (.TXT)</span>
                </button>

                <button
                  type="button"
                  onClick={copyAllIdeas}
                  className="px-3.5 py-2 rounded-xl bg-[#5b50e5] hover:bg-[#4b40d5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAll ? 'Tersalin!' : 'Salin Semua'}</span>
                </button>
              </div>
            </div>

            {/* View Mode 1: Individual Parsed Idea Cards */}
            {viewMode === 'cards' && parsedIdeas.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {parsedIdeas.map((idea) => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idea.id * 0.05 }}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-5 hover:border-slate-300 transition-all shadow-sm relative overflow-hidden"
                  >
                    {/* Top Decorative Indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#5b50e5]" />

                    {/* Card Header & Main Action Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-2xl bg-indigo-50 text-[#5b50e5] border border-indigo-100 flex items-center justify-center font-bold text-base shadow-2xs">
                          #{idea.id}
                        </span>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                            {idea.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-medium text-slate-500">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Durasi: {maxDuration}s
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                              <Scissors className="w-3 h-3 text-cyan-600" /> Klip: {segmentDuration === 'auto' ? 'Otomatis' : `${segmentDuration}s`}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-800 border border-pink-200 flex items-center gap-1 uppercase">
                              <Video className="w-3 h-3 text-pink-600" /> AI: {targetAI}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => downloadIdeaAsTxt(idea)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Unduh paket ide ini sebagai file .txt"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Unduh .TXT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyIdea(idea)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-[#5b50e5] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Salin seluruh konsep ide ini"
                        >
                          {copiedIdeaId === idea.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#5b50e5]" />
                          )}
                          <span>{copiedIdeaId === idea.id ? 'Tersalin' : 'Salin Paket Ide'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Meta info grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {idea.typeAndAngle && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1 tracking-wider">
                            <Target className="w-3.5 h-3.5 text-[#5b50e5]" /> Tipe & Angle Konten
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">{idea.typeAndAngle}</p>
                        </div>
                      )}

                      {idea.targetAudience && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1 tracking-wider">
                            <Megaphone className="w-3.5 h-3.5 text-emerald-600" /> Target Audience
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">{idea.targetAudience}</p>
                        </div>
                      )}
                    </div>

                    {/* Hook 3 Detik */}
                    {idea.hook && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1.5 tracking-wider">
                            <Flame className="w-4 h-4 text-amber-600 animate-pulse" /> Hook Pikat (3 Detik Pertama Video)
                          </span>
                          <button
                            type="button"
                            onClick={() => copyHookOnly(idea)}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedHookId === idea.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                            <span>{copiedHookId === idea.id ? 'Tersalin' : 'Salin Hook'}</span>
                          </button>
                        </div>
                        <p className="text-amber-950 font-bold italic text-sm sm:text-base leading-snug">
                          "{idea.hook}"
                        </p>
                      </div>
                    )}

                    {/* Visual & Audio Guide */}
                    {idea.visualAudioGuide && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1.5 tracking-wider">
                            <Video className="w-4 h-4 text-purple-600" /> Panduan Visual & Audio
                          </span>
                          <button
                            type="button"
                            onClick={() => copyVisualOnly(idea)}
                            className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedVisualId === idea.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
                            <span>{copiedVisualId === idea.id ? 'Tersalin' : 'Salin Panduan'}</span>
                          </button>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-sans">
                          {idea.visualAudioGuide}
                        </p>
                      </div>
                    )}

                    {/* Scene / Segment Split Prompts (Kartu Per-Klip Terpisah) */}
                    {idea.scenePrompts && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-cyan-50/50 border border-cyan-200 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-cyan-200/80">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700 border border-cyan-200">
                              <Scissors className="w-4 h-4" />
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
                                Rincian Adegan Video & Prompt AI per Segmen
                              </h5>
                              <span className="text-[11px] text-slate-600 font-medium">
                                Total {maxDuration}s • {idea.clips.length > 0 ? `${idea.clips.length} Klip Segmen` : `Segmen ${segmentDuration}s`}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyScenesOnly(idea)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 text-cyan-900 text-xs font-bold flex items-center gap-1.5 transition-colors self-end sm:self-auto cursor-pointer"
                            title="Salin seluruh prompt adegan ide ini sekaligus"
                          >
                            {copiedScenesId === idea.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-cyan-700" />
                            )}
                            <span>{copiedScenesId === idea.id ? 'Tersalin' : 'Salin Semua Klip'}</span>
                          </button>
                        </div>

                        {/* Kartu per-klip terpisah */}
                        {idea.clips.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3.5 pt-1">
                            {idea.clips.map((clip) => {
                              const clipKey = `${idea.id}_${clip.id}`;
                              const isCopied = copiedClipKey === clipKey;

                              return (
                                <div
                                  key={clip.id}
                                  className="p-3.5 sm:p-4 rounded-xl bg-white border border-cyan-200/80 hover:border-cyan-400 transition-all space-y-2.5 relative group shadow-2xs"
                                >
                                  {/* Clip Card Header */}
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-mono font-bold text-[11px] border border-cyan-200">
                                        [{clip.timeRange}]
                                      </span>
                                      <span className="text-xs font-bold text-slate-900">
                                        {clip.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {onSendToPhotoPrompt && clip.aiPrompt && (
                                        <button
                                          type="button"
                                          onClick={() => onSendToPhotoPrompt(`Visual adegan klip [${clip.timeRange}]: ${clip.aiPrompt}`)}
                                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                          title="Kirim deskripsi visual klip ini ke Generator Prompt Foto"
                                        >
                                          <Camera className="w-3 h-3 text-purple-600" />
                                          <span className="hidden sm:inline">Ke Prompt Foto</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => copyClipOnly(idea.id, clip)}
                                        className="px-2.5 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 border border-cyan-200 text-cyan-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Salin isi klip ini saja"
                                      >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-cyan-700" />}
                                        <span>{isCopied ? 'Tersalin' : 'Salin Prompt Klip'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Aksi & Dialog / Voice-Over */}
                                  {clip.actionAndVO && (
                                    <div className="text-xs space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 tracking-wider">
                                        <MessageSquare className="w-3 h-3 text-amber-600" /> Aksi & Dialog / Voice-Over:
                                      </span>
                                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-sans">
                                        {clip.actionAndVO}
                                      </p>
                                    </div>
                                  )}

                                  {/* Prompt AI Video */}
                                  {clip.aiPrompt && (
                                    <div className="text-xs space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-cyan-800 flex items-center gap-1 tracking-wider">
                                        <Wand2 className="w-3 h-3 text-cyan-600" /> Prompt AI Video Generator ({targetAI.toUpperCase()}):
                                      </span>
                                      <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-cyan-300 leading-relaxed select-all">
                                        {clip.aiPrompt}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="markdown-body text-xs text-slate-800 leading-relaxed font-sans space-y-2">
                            <ReactMarkdown>{idea.scenePrompts}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Caption Relevan */}
                    {idea.caption && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <MessageSquare className="w-4 h-4 text-emerald-600" /> Caption Relevan Persuasif
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCaptionOnly(idea)}
                            className="px-3 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedCaptionId === idea.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span>{copiedCaptionId === idea.id ? 'Tersalin' : 'Salin Caption'}</span>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                          {idea.caption}
                        </p>
                      </div>
                    )}

                    {/* Hashtags Relevan */}
                    {idea.hashtags && (
                      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <Hash className="w-4 h-4 text-[#5b50e5]" /> Hashtag Relevan High-Traffic
                          </span>
                          <button
                            type="button"
                            onClick={() => copyHashtagsOnly(idea)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedHashtagsId === idea.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#5b50e5]" />
                            )}
                            <span>{copiedHashtagsId === idea.id ? 'Tersalin' : 'Salin Hashtag'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-[#5b50e5] font-mono leading-relaxed font-semibold">
                          {idea.hashtags}
                        </p>
                      </div>
                    )}

                    {/* Bottom Cross-Tool Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => downloadIdeaAsTxt(idea)}
                        className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Simpan Ide #{idea.id} sebagai file .txt</span>
                      </button>

                      {onSendToPhotoPrompt && (
                        <button
                          type="button"
                          onClick={() => onSendToPhotoPrompt(`Foto thumbnail / adegan video untuk ide: ${idea.title}. ${idea.visualAudioGuide}`)}
                          className="text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-purple-600" />
                          <span>Buat Prompt Foto Thumbnail dari Ide Ini →</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* View Mode 2: Full Markdown View */
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="markdown-body text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4">
                  <ReactMarkdown>{rawResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
