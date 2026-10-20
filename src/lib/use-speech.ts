/**
 * 用途：封装浏览器语音识别与语音播报，供诊断页做语音问诊和结果朗读。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = finalTextRef.current;
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const value = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          finalText += value;
        } else {
          interimText += value;
        }
      }

      finalTextRef.current = finalText;
      const combined = `${finalText}${interimText}`.trim();
      setTranscript(combined);

      if (finalText.trim()) {
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      const reason = event?.error ?? "unknown";
      const message =
        reason === "not-allowed"
          ? "麦克风权限被拒绝，请在浏览器设置中允许后重试。"
          : reason === "no-speech"
            ? "没有听到声音，请再试一次。"
            : "语音识别暂时不可用，请改用文字输入。";
      setError(message);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("当前浏览器不支持语音识别，请使用 Chrome 或 Edge。");
      return;
    }

    finalTextRef.current = "";
    onFinalRef.current = onFinal;
    setTranscript("");
    setError("");

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("语音识别启动失败，请稍后重试或改用文字输入。");
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return {
    supported,
    listening,
    transcript,
    error,
    startListening,
    stopListening,
  };
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const content = text.replace(/\s+/g, " ").trim().slice(0, 600);
    if (!content) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "zh-CN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speaking, speak, stopSpeaking };
}
