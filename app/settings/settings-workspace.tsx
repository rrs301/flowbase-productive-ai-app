"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { CheckoutButton, SubscriptionDetailsButton, useSubscription } from "@clerk/nextjs/experimental";
import {
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  Edit3,
  Focus,
  Hammer,
  Heart,
  KeyRound,
  LayoutTemplate,
  ListChecks,
  LucideIcon,
  Moon,
  NotebookPen,
  Palette,
  Plus,
  Save,
  Shield,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  User,
  Users,
  WandSparkles,
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";

import {
  createCategory,
  deleteCategory,
  exportUserData,
  SettingsPageData,
  updateCategory,
  updateUserSettings,
  type CategoryInput,
  type UserSettingsDTO,
} from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryScope, UserCategoryDTO } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "subscription" | "categories" | "ai" | "preferences" | "privacy";

const sections: Array<{ id: SettingsSection; label: string; icon: LucideIcon }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "subscription", label: "Subscription", icon: Sparkles },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "ai", label: "AI Settings", icon: Bot },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
];

const categoryScopeMeta: Record<CategoryScope, { label: string; icon: LucideIcon; hint: string }> = {
  calendar: { label: "Calendar events", icon: CalendarDays, hint: "Used for scheduled work and planning blocks." },
  task: { label: "Tasks / Kanban", icon: ListChecks, hint: "Used as task categories alongside labels." },
  note: { label: "Notes", icon: NotebookPen, hint: "Used to group notes beyond icon and color." },
  reminder: { label: "Reminders", icon: Bell, hint: "Used for reminder-style calendar items." },
};

const categoryScopes: CategoryScope[] = ["calendar", "task", "note", "reminder"];
const iconMap: Record<string, LucideIcon> = {
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Focus,
  Hammer,
  Heart,
  LayoutTemplate,
  ListChecks,
  NotebookPen,
  Sparkles,
  Tag,
  Users,
  WandSparkles,
};
const iconOptions = Object.keys(iconMap);
const colorOptions = ["#5BAE91", "#EF806F", "#E6A23C", "#4BA3C7", "#8B7CF6", "#94A3B8"];
const proPlanId = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;

const emptyCategoryForm: CategoryInput = {
  scope: "calendar",
  name: "",
  color: colorOptions[0],
  icon: "Tag",
};

export function SettingsWorkspace({ initialData }: { initialData: SettingsPageData }) {
  const { user } = useUser();
  const clerk = useClerk();
  const subscription = useSubscription();
  const [active, setActive] = useState<SettingsSection>("profile");
  const [settings, setSettings] = useState(initialData.settings);
  const [categories, setCategories] = useState(initialData.categories);
  const [categoryForm, setCategoryForm] = useState<CategoryInput>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const categoriesByScope = useMemo(
    () =>
      categoryScopes.reduce<Record<CategoryScope, UserCategoryDTO[]>>((grouped, scope) => {
        grouped[scope] = categories.filter((category) => category.scope === scope);
        return grouped;
      }, {} as Record<CategoryScope, UserCategoryDTO[]>),
    [categories],
  );

  function saveSettings(input: Partial<UserSettingsDTO>) {
    const optimistic = { ...settings, ...input };
    setSettings(optimistic);
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        setSettings(await updateUserSettings(input));
        setMessage("Settings saved.");
      } catch (requestError) {
        setSettings(settings);
        setError(requestError instanceof Error ? requestError.message : "Could not save settings.");
      }
    });
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const saved = editingCategoryId
          ? await updateCategory(editingCategoryId, categoryForm)
          : await createCategory(categoryForm);
        setCategories((current) =>
          editingCategoryId ? current.map((category) => (category.id === saved.id ? saved : category)) : [...current, saved],
        );
        setCategoryForm({ ...emptyCategoryForm, scope: categoryForm.scope });
        setEditingCategoryId(null);
        setMessage(editingCategoryId ? "Category updated." : "Category created.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save category.");
      }
    });
  }

  function removeCategory(category: UserCategoryDTO) {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteCategory(category.id);
        setCategories((current) => current.filter((item) => item.id !== category.id));
        setMessage("Category deleted.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not delete category.");
      }
    });
  }

  function exportData() {
    startTransition(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `flowbase-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setMessage("Data export prepared.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not export data.");
      }
    });
  }

  const subscriptionData = subscription.data as Record<string, any> | null | undefined;
  const planName =
    subscriptionData?.plan?.name ||
    subscriptionData?.subscriptionItems?.[0]?.plan?.name ||
    (initialData.isPro ? "Pro" : "Free");
  const status = subscriptionData?.status || (initialData.isPro ? "Active" : "Free");
  const renewalDate = subscriptionData?.nextPayment?.date || subscriptionData?.periodEnd || subscriptionData?.activeAt;

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-border bg-card p-2 shadow-sm">
        <nav className="grid gap-1" aria-label="Settings sections">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className={cn(
                  "flex h-10 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors",
                  active === section.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 space-y-5">
        {(message || error) && (
          <div className={cn("rounded-lg border px-3 py-2 text-sm", error ? "border-clay-200 bg-clay-100 text-clay-800" : "border-sage-200 bg-sage-100 text-sage-800")}>
            {error || message}
          </div>
        )}

        {active === "profile" && (
          <SettingsCard title="Profile" icon={User}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="size-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-lg bg-sage-100 text-lg font-semibold text-sage-700">
                    {initialData.profile.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{user?.fullName || initialData.profile.name || "Flowbase user"}</p>
                  <p className="truncate text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || initialData.profile.email}</p>
                </div>
              </div>
              <Button className="rounded-lg" onClick={() => clerk.openUserProfile()}>
                <Edit3 className="mr-2 size-4" aria-hidden="true" />
                Edit profile
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ActionTile icon={KeyRound} title="Account security" text="Manage sign-in methods, sessions, and MFA through Clerk." />
              <ActionTile icon={Shield} title="Workspace privacy" text="Keep sensitive previews quieter with privacy mode." />
            </div>
          </SettingsCard>
        )}

        {active === "subscription" && (
          <SettingsCard title="Subscription" icon={Sparkles}>
            <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{planName}</span>
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{String(status)}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{initialData.isPro ? "All access enabled" : "Free workspace"}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {renewalDate ? `Next billing activity: ${new Date(renewalDate).toLocaleDateString()}` : "Upgrade to Pro for unlimited workspace and AI access."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SubscriptionDetailsButton>
                    <Button variant="outline" className="rounded-lg bg-card" disabled={subscription.isLoading}>
                      Manage subscription
                    </Button>
                  </SubscriptionDetailsButton>
                  {!initialData.isPro && proPlanId ? (
                    <CheckoutButton planId={proPlanId} planPeriod="month">
                      <Button className="rounded-lg">Upgrade Plan</Button>
                    </CheckoutButton>
                  ) : null}
                </div>
              </div>
              <UsagePanel data={initialData} />
            </div>
          </SettingsCard>
        )}

        {active === "categories" && (
          <SettingsCard title="Dynamic Categories" icon={Tag}>
            <form className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitCategory}>
              <label className="text-sm font-medium">
                Scope
                <select
                  value={categoryForm.scope}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, scope: event.target.value }))}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {categoryScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {categoryScopeMeta[scope].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Name
                <input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Category name"
                />
              </label>
              <Button className="mt-auto rounded-lg" disabled={isPending || !categoryForm.name.trim()}>
                {editingCategoryId ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                {editingCategoryId ? "Save" : "Add"}
              </Button>
              <div className="md:col-span-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-sm font-medium">Color</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button key={color} type="button" onClick={() => setCategoryForm((current) => ({ ...current, color }))} className={cn("flex size-9 items-center justify-center rounded-lg border", categoryForm.color === color ? "border-foreground" : "border-border")} aria-label={color} title={color}>
                        <span className="size-4 rounded-full" style={{ backgroundColor: color }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Icon</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {iconOptions.map((icon) => {
                      const Icon = iconMap[icon];
                      return (
                        <button key={icon} type="button" onClick={() => setCategoryForm((current) => ({ ...current, icon }))} className={cn("flex size-9 items-center justify-center rounded-lg border", categoryForm.icon === icon ? "border-foreground bg-muted" : "border-border hover:bg-muted")} aria-label={icon} title={icon}>
                          <Icon className="size-4" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {categoryScopes.map((scope) => {
                const meta = categoryScopeMeta[scope];
                const ScopeIcon = meta.icon;
                return (
                  <div key={scope} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                        <ScopeIcon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{meta.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.hint}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {categoriesByScope[scope].map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEdit={() => {
                            setCategoryForm({ scope: category.scope, name: category.name, color: category.color, icon: category.icon });
                            setEditingCategoryId(category.id);
                          }}
                          onDelete={() => removeCategory(category)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        )}

        {active === "ai" && (
          <SettingsCard title="AI Settings" icon={Bot}>
            <div className="grid gap-4 lg:grid-cols-3">
              <SelectSetting label="Preferred model" value={settings.aiModel} onChange={(aiModel) => saveSettings({ aiModel })} options={["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"]} />
              <SelectSetting label="Default behavior" value={settings.aiBehavior} onChange={(aiBehavior) => saveSettings({ aiBehavior })} options={["concise", "balanced", "detailed"]} />
              <SelectSetting label="Tone / style" value={settings.aiTone} onChange={(aiTone) => saveSettings({ aiTone })} options={["Friendly", "Professional", "Confident", "Casual"]} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ToggleSetting label="AI Refine" checked={settings.aiRefineEnabled} onChange={(aiRefineEnabled) => saveSettings({ aiRefineEnabled })} />
              <ToggleSetting label="AI Assistant" checked={settings.aiAssistantEnabled} onChange={(aiAssistantEnabled) => saveSettings({ aiAssistantEnabled })} />
              <ToggleSetting label="AI Template Builder" checked={settings.aiTemplateBuilderEnabled} onChange={(aiTemplateBuilderEnabled) => saveSettings({ aiTemplateBuilderEnabled })} />
              <ToggleSetting label="AI Diagram" checked={settings.aiDiagramEnabled} onChange={(aiDiagramEnabled) => saveSettings({ aiDiagramEnabled })} />
            </div>
          </SettingsCard>
        )}

        {active === "preferences" && (
          <SettingsCard title="App Preferences" icon={Palette}>
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectSetting label="Theme" value={settings.theme} onChange={(theme) => saveSettings({ theme })} options={["system", "light", "dark"]} icon={settings.theme === "dark" ? Moon : Sun} />
              <SelectSetting label="Default calendar view" value={settings.defaultCalendarView} onChange={(defaultCalendarView) => saveSettings({ defaultCalendarView })} options={["month", "week"]} />
              <SelectSetting label="Default task priority" value={settings.defaultTaskPriority} onChange={(defaultTaskPriority) => saveSettings({ defaultTaskPriority })} options={["low", "medium", "high"]} />
              <ToggleSetting label="Auto-save" checked={settings.autoSaveEnabled} onChange={(autoSaveEnabled) => saveSettings({ autoSaveEnabled })} />
              <ToggleSetting label="In-app notifications" checked={settings.notificationsEnabled} onChange={(notificationsEnabled) => saveSettings({ notificationsEnabled })} />
              <ToggleSetting label="Email notifications" checked={settings.emailNotificationsEnabled} onChange={(emailNotificationsEnabled) => saveSettings({ emailNotificationsEnabled })} />
            </div>
            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Data export</p>
                  <p className="mt-1 text-sm text-muted-foreground">Download your Flowbase data as JSON.</p>
                </div>
                <Button variant="outline" className="rounded-lg bg-card" onClick={exportData} disabled={isPending}>
                  <Download className="mr-2 size-4" aria-hidden="true" />
                  Export data
                </Button>
              </div>
            </div>
          </SettingsCard>
        )}

        {active === "privacy" && (
          <SettingsCard title="Privacy and Security" icon={Shield}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleSetting label="Privacy mode" checked={settings.privacyModeEnabled} onChange={(privacyModeEnabled) => saveSettings({ privacyModeEnabled })} />
              <ToggleSetting label="Dismiss MFA reminder" checked={settings.twoFactorReminderDismissed} onChange={(twoFactorReminderDismissed) => saveSettings({ twoFactorReminderDismissed })} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ActionTile icon={KeyRound} title="Authentication" text="Profile, passwordless sign-in, connected accounts, and sessions are managed by Clerk." />
              <ActionTile icon={Shield} title="User-scoped data" text="Settings and categories are saved to your signed-in Flowbase account." />
            </div>
          </SettingsCard>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Card className="min-w-0 rounded-lg border-border bg-card shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">{children}</CardContent>
    </Card>
  );
}

function ActionTile({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left">
      <span className="text-sm font-medium">{label}</span>
      <span className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("size-5 rounded-full bg-card shadow-sm transition-transform", checked && "translate-x-5")} />
      </span>
    </button>
  );
}

function SelectSetting({ label, value, options, onChange, icon: Icon }: { label: string; value: string; options: string[]; onChange: (value: string) => void; icon?: LucideIcon }) {
  return (
    <label className="block rounded-lg border border-border bg-background p-3 text-sm font-medium">
      <span className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-primary" aria-hidden="true" /> : null}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm capitalize outline-none focus:ring-1 focus:ring-ring">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CategoryRow({ category, onEdit, onDelete }: { category: UserCategoryDTO; onEdit: () => void; onDelete: () => void }) {
  const Icon = iconMap[category.icon] || Tag;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: category.color }}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">{category.color}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" onClick={onEdit} aria-label={`Edit ${category.name}`}>
        <Edit3 className="size-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label={`Delete ${category.name}`}>
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function UsagePanel({ data }: { data: SettingsPageData }) {
  const usageRows = [
    ["Boards", data.usage.boards, data.limits.boards],
    ["Tasks", data.usage.tasks, data.limits.tasks],
    ["Notes", data.usage.notes, data.limits.notes],
    ["Spaces", data.usage.spaces, data.limits.spaces],
    ["Whiteboards", data.usage.whiteboards, data.limits.whiteboards],
    ["AI actions today", data.usage.aiActionsToday, data.limits.aiActionsPerDay],
  ] as const;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="font-medium">Free plan limits</p>
      <div className="mt-3 space-y-2">
        {usageRows.map(([label, value, limit]) => {
          const percent = data.isPro ? 100 : Math.min(100, Math.round((value / limit) * 100));
          return (
            <div key={label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{data.isPro ? `${value} / Unlimited` : `${value} / ${limit}`}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
