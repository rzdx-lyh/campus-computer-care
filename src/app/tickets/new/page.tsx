/**
 * 用途：工单提交页，提供设备、宿舍、故障描述、照片与预约时段录入骨架。
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { clearDiagnosisTicketDraft, readDiagnosisTicketDraft } from "@/lib/diagnosis-draft";
import { addStoredTicket, createTicketId } from "@/lib/storage";
import type { TicketPriority } from "@/lib/types";

const DEVICE_TYPES = ["笔记本电脑", "台式电脑", "平板电脑", "显示器", "其他设备"];
const TIME_SLOTS = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00", "19:00-21:00"];

export default function NewTicketPage() {
  const router = useRouter();
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);
  const [form, setForm] = useState({
    title: "",
    deviceType: "笔记本电脑",
    dorm: "",
    description: "",
    appointmentDate: "",
    appointmentSlot: TIME_SLOTS[0],
    priority: "medium" as TicketPriority,
  });

  useEffect(() => {
    const draft = readDiagnosisTicketDraft();
    if (!draft) return;

    setForm((current) => ({
      ...current,
      title: draft.title,
      deviceType: draft.deviceType,
      description: draft.description,
      priority: draft.priority,
    }));
    setDraftApplied(true);
  }, []);
  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPhotoError("");
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("图片请控制在 2 MB 以内");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(typeof reader.result === "string" ? reader.result : "");
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (photoError) return;
    setSubmitting(true);

    addStoredTicket({
      id: createTicketId(),
      title: form.title.trim(),
      description: form.description.trim(),
      deviceType: form.deviceType,
      dorm: form.dorm.trim(),
      photo,
      status: "pending",
      priority: form.priority,
      createdAt: new Date().toISOString(),
      repairNote: "",
      appointment: form.appointmentDate
        ? `${form.appointmentDate} ${form.appointmentSlot}`
        : undefined,
    });

    clearDiagnosisTicketDraft();
    router.push("/tickets?created=1");
  };

  return (
    <div>
      <PageHeader
        eyebrow="NEW REPAIR TICKET"
        title="提交维修工单"
        description="填写设备信息和预约时间，维修员接单后会与你联系。带 * 项为必填。"
        action={
          <Link href="/tickets" className="secondary-button">
            <Icon name="clipboard" className="size-4" />
            查看我的工单
          </Link>
        }
      />
      {draftApplied ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 text-sm text-campus-900 sm:flex-row sm:items-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-campus-600 text-white">
            <Icon name="sparkles" className="size-4" />
          </span>
          <div className="flex-1">
            <p className="font-bold">已带入 AI 诊断草稿</p>
            <p className="mt-0.5 text-xs text-campus-800/70">
              标题、设备类型、故障描述和优先级已自动填写，请补充宿舍与预约时间。
            </p>
          </div>
          <Link href="/diagnosis" className="text-xs font-semibold text-campus-700 hover:text-campus-900">
            重新诊断
          </Link>
        </div>
      ) : null}


      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <section className="surface-card p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-sm font-bold text-campus-700">
                1
              </span>
              <div>
                <h2 className="font-bold text-slate-900">基本信息</h2>
                <p className="mt-0.5 text-xs text-slate-400">告诉我们设备在哪里、是什么类型</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="title" className="field-label">
                  故障标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="title"
                  required
                  maxLength={60}
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  className="field-input"
                  placeholder="例如：开机后风扇噪音很大"
                />
              </div>
              <div>
                <label htmlFor="deviceType" className="field-label">
                  设备类型 <span className="text-rose-500">*</span>
                </label>
                <select
                  id="deviceType"
                  required
                  value={form.deviceType}
                  onChange={(event) => updateField("deviceType", event.target.value)}
                  className="field-input"
                >
                  {DEVICE_TYPES.map((device) => (
                    <option key={device}>{device}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dorm" className="field-label">
                  宿舍楼号 / 房间号 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Icon
                    name="building"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="dorm"
                    required
                    value={form.dorm}
                    onChange={(event) => updateField("dorm", event.target.value)}
                    className="field-input pl-10"
                    placeholder="例如：紫荆 3 号楼 402"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="priority" className="field-label">
                  紧急程度
                </label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                  className="field-input"
                >
                  <option value="low">普通 · 不影响基本使用</option>
                  <option value="medium">较急 · 影响学习使用</option>
                  <option value="high">紧急 · 已无法使用</option>
                </select>
              </div>
            </div>
          </section>

          <section className="surface-card p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-sm font-bold text-campus-700">
                2
              </span>
              <div>
                <h2 className="font-bold text-slate-900">故障描述</h2>
                <p className="mt-0.5 text-xs text-slate-400">越具体，维修员越容易提前准备</p>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                详细描述 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="description"
                required
                minLength={10}
                maxLength={1000}
                rows={6}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="field-input resize-y"
                placeholder="请描述故障发生时间、具体表现、是否出现过报错，以及已经尝试过的处理方法…"
              />
              <p className="mt-2 text-right text-[11px] text-slate-400">
                {form.description.length}/1000
              </p>
            </div>

            <div className="mt-5">
              <span className="field-label">现场照片（可选）</span>
              <label
                htmlFor="photo"
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center transition hover:border-campus-300 hover:bg-campus-50/50"
              >
                {photo ? (
                  <>
                    <img
                      src={photo}
                      alt="工单照片预览"
                      className="mb-3 max-h-36 rounded-xl object-contain shadow-sm"
                    />
                    <span className="text-xs font-semibold text-campus-700">{photoName}</span>
                    <span className="mt-1 text-[11px] text-slate-400">点击可重新选择</span>
                  </>
                ) : (
                  <>
                    <span className="grid size-11 place-items-center rounded-xl bg-white text-campus-600 shadow-sm transition group-hover:-translate-y-0.5">
                      <Icon name="upload" className="size-5" />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-slate-700">上传故障照片</span>
                    <span className="mt-1 text-xs text-slate-400">支持 JPG / PNG，最大 2 MB</span>
                  </>
                )}
                <input
                  id="photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
              {photoError ? <p className="mt-2 text-xs font-medium text-rose-600">{photoError}</p> : null}
            </div>
          </section>

          <section className="surface-card p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-sm font-bold text-campus-700">
                3
              </span>
              <div>
                <h2 className="font-bold text-slate-900">预约上门</h2>
                <p className="mt-0.5 text-xs text-slate-400">请选择你在宿舍的时间段</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="appointmentDate" className="field-label">
                  预约日期
                </label>
                <input
                  id="appointmentDate"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.appointmentDate}
                  onChange={(event) => updateField("appointmentDate", event.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="appointmentSlot" className="field-label">
                  时间段
                </label>
                <select
                  id="appointmentSlot"
                  value={form.appointmentSlot}
                  onChange={(event) => updateField("appointmentSlot", event.target.value)}
                  className="field-input"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="surface-card top-40 p-5 lg:sticky">
            <h2 className="text-sm font-bold text-slate-900">提交前确认</h2>
            <ul className="mt-4 space-y-3">
              {[
                "设备与宿舍信息填写正确",
                "故障描述包含现象和发生时间",
                "预约时段本人在宿舍",
                "照片不含个人隐私信息",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <button type="submit" disabled={submitting} className="primary-button mt-6 w-full">
              {submitting ? "正在提交…" : "提交维修工单"}
              <Icon name="arrow-right" className="size-4" />
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">
              提交即表示同意维修员在预约时段联系你。
            </p>
          </div>

          <div className="rounded-2xl border border-campus-100 bg-campus-50/70 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-campus-800">
              <Icon name="sparkles" className="size-4" />
              不确定怎么描述？
            </div>
            <p className="mt-2 text-xs leading-5 text-campus-800/70">
              可以先使用 AI 诊断整理故障现象，再复制建议到工单描述中。
            </p>
            <Link href="/diagnosis" className="ghost-button mt-2 px-0">
              打开 AI 诊断 <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}


