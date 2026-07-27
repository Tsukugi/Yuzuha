import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Alert,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '../data/AppStore';
import {formatDate, formatMoney, sumMoney} from '../shared/format';
import {formatDuration} from '../shared/duration';
import {formatPeriodRange, getLocalDateKeys, getPeriodRange, isInPeriod, localDateKey, periodLabel} from '../shared/period';
import type {Period} from '../shared/period';
import {buildBudgetProjection, validateMoneyBudget, type MoneyBudgetInput} from '../shared/moneyBudget';
import {buildMoneyReport, emptyMoneyReportFilter, type MoneyReportFilter} from '../shared/moneyReport';
import {emptyMoneyEntryFilter, filterMoneyEntries, summarizeMoneyEntries, type MoneyFilterPeriod} from '../shared/moneyFilter';
import {validateMoneySplit, type MoneySplitInput} from '../shared/moneySplit';
import {calculateAccountBalance, validateMoneyTransfer} from '../shared/moneyTransfer';
import {aggregateUsagePeriod, getLocalDayRanges, sumUsage, type UsageRecord} from '../shared/usage';
import {buildReviewSummary} from '../shared/review';
import {buildJsonExport, buildMoneyCsvExport} from '../shared/dataExport';
import {parseJsonImport, type JsonImportPreview} from '../shared/dataImport';
import {
  buildEncryptedBackup,
  decryptEncryptedBackup,
  generateRecoveryKey,
  normalizeRecoveryKey,
  type EncryptedBackupPreview,
} from '../shared/encryptedBackup';
import {
  EncryptedBackupFileCanceled,
  openEncryptedBackupFile,
  saveRecoveryEncryptedBackupFile,
  saveEncryptedBackupFile,
} from '../shared/encryptedBackupFile';
import {
  MoneyCsvImportFileCanceled,
  openMoneyCsvImportFile,
  type MoneyCsvImportFilePreview,
} from '../shared/moneyCsvImportFile';
import {
  JsonImportFileCanceled,
  openJsonImportFile,
  type JsonImportFilePreview,
} from '../shared/jsonImportFile';
import {AttachmentFileCanceled, deleteAttachmentFile, importAttachmentFile, openAttachmentFile, readAttachmentBackupFiles, stageAttachmentBackupFiles} from '../shared/attachmentFiles';
import {type MoneyRecurrenceInput} from '../shared/moneyRecurrence';
import {ATTACHMENT_MAX_PER_NOTE} from '../shared/attachment';
import {normalizeNoteTags} from '../shared/noteSearch';
import {applyNoteMarkup, parseNoteMarkup, type NoteMarkupAction, type NoteTextSelection} from '../shared/noteMarkup';
import {NOTE_LINK_TARGET_TYPES} from '../shared/noteLinks';
import {filterNotes, validateNoteDraft} from '../shared/noteLifecycle';
import {globalSearchNavigation, searchGlobal, type GlobalSearchKind, type GlobalSearchNavigation} from '../shared/globalSearch';
import {getTaskSourceLabel} from '../shared/noteTask';
import {filterTasks, sortTasks, TASK_INBOX_LIST_ID, validateTaskDraft, type TaskDraft, type TaskFilter, type TaskSort} from '../shared/taskLifecycle';
import {validateProjectDraft, type ProjectDraft} from '../shared/projectLifecycle';
import {getBlockingTaskIds} from '../shared/taskDependency';
import {buildTaskAgenda} from '../shared/taskAgenda';
import {validateTaskListDraft} from '../shared/taskListLifecycle';
import {validateAppGroupDraft} from '../shared/appGroupLifecycle';
import {focusSessionDurationSeconds} from '../shared/focusSessionLifecycle';
import {validateTaskRecurrenceDraft, type TaskRecurrenceDraft} from '../shared/taskRecurrence';
import {validateTaskTemplateDraft, type TaskTemplateDraft} from '../shared/taskTemplateLifecycle';
import {QUICK_CAPTURE_OPTIONS} from '../shared/quickCapture';
import {sharedCaptureTitle, type SharedCapture} from '../shared/shareCapture';
import {formatTaskReminderLocalDateTime, parseTaskReminderLocalDateTime, validateTaskReminderDraft} from '../shared/taskReminder';
import {DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES, TASK_REMINDER_SNOOZE_DURATION_OPTIONS} from '../shared/notificationSettings';
import {createId} from '../shared/id';
import {usageAccess} from '../platform/usageAccess';
import {taskReminders} from '../platform/taskReminders';
import {shareCapture} from '../platform/shareCapture';
import {launchActions} from '../platform/launchActions';
import {deepLinks} from '../platform/deepLinks';
import {calendarDrafts} from '../platform/calendarDrafts';
import type {TaskReminderTarget} from '../platform/taskReminders';
import type {LaunchAction} from '../shared/launchAction';
import type {DeepLinkTarget} from '../shared/deepLink';
import {validateCalendarTaskDraft} from '../shared/calendarDraft';
import type {AppData, Attachment, BudgetPeriod, BudgetRollover, MissedOccurrencePolicy, MoneyKind, MoneyTransfer, Note, NoteLink, NoteLinkTargetType, RecurrenceCadence, SavedSearch, Task, TaskPriority, TaskProject, TaskReminderSnoozeDurationMinutes, TaskTemplate, WeekStartDay} from '../types/domain';

type Tab = 'home' | 'money' | 'notes' | 'tasks' | 'appTime';

const colors = {
  background: '#101820',
  card: '#19272a',
  cardRaised: '#203234',
  text: '#f4f7f5',
  muted: '#aebdb7',
  accent: '#8be9c1',
  accentText: '#102019',
  warning: '#ffd166',
  danger: '#ff8b8b',
  border: '#2b4140',
};

export function MainApp({bundleVersion}: {bundleVersion: string}) {
  const {data, isLoading, error, addNote, addNoteWithAttachment, addTask, completeTaskFromReminder, snoozeTaskFromReminder} = useAppStore();
  const [tab, setTab] = useState<Tab>('home');
  const [dataToolsOpen, setDataToolsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sharedCapture, setSharedCapture] = useState<SharedCapture | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [pendingMoneyId, setPendingMoneyId] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingReminderAction, setPendingReminderAction] = useState<TaskReminderTarget | null>(null);
  const lastSharedCaptureKey = useRef<string | null>(null);

  const openGlobalSearchResult = useCallback((navigation: GlobalSearchNavigation) => {
    setPendingTaskId(navigation.focusTaskId);
    setPendingNoteId(navigation.focusNoteId);
    setPendingMoneyId(navigation.focusMoneyId);
    setPendingProjectId(navigation.focusProjectId);
    setPendingTemplateId(navigation.focusTemplateId);
    setGlobalSearchOpen(false);
    setTab(navigation.destination);
  }, []);

  const openSharedCapture = useCallback((capture: SharedCapture) => {
    const key = `${capture.mimeType ?? ''}\u0000${capture.subject ?? ''}\u0000${capture.text}`;
    if (lastSharedCaptureKey.current === key) {
      return;
    }
    lastSharedCaptureKey.current = key;
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setSharedCapture(capture);
  }, []);

  const closeSharedCapture = useCallback((nextTab?: Tab) => {
    lastSharedCaptureKey.current = null;
    setSharedCapture(null);
    if (nextTab) {
      setTab(nextTab);
    }
  }, []);

  const openLaunchAction = useCallback((action: LaunchAction) => {
    lastSharedCaptureKey.current = null;
    setSharedCapture(null);
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setTab(action);
  }, []);

  const openDeepLink = useCallback((target: DeepLinkTarget) => {
    lastSharedCaptureKey.current = null;
    setSharedCapture(null);
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setTab(target);
  }, []);

  const openReminderTask = useCallback((taskId: string) => {
    setPendingTaskId(taskId);
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setTab('tasks');
  }, []);

  const handleReminderTarget = useCallback((target: TaskReminderTarget) => {
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setTab('tasks');
    if (target.action === 'complete' || target.action === 'snooze') {
      setPendingReminderAction(target);
    } else {
      openReminderTask(target.taskId);
    }
  }, [openReminderTask]);

  useEffect(() => {
    let mounted = true;
    const openSubscription = taskReminders.onTaskReminderOpened(taskId => {
      if (mounted) {
        openReminderTask(taskId);
      }
    });
    const actionSubscription = taskReminders.onTaskReminderAction(target => {
      if (mounted) {
        handleReminderTarget(target);
      }
    });
    void taskReminders.getPendingTarget().then(target => {
      if (mounted && target) {
        handleReminderTarget(target);
      }
    });
    return () => {
      mounted = false;
      openSubscription.remove();
      actionSubscription.remove();
    };
  }, [handleReminderTarget, openReminderTask]);

  useEffect(() => {
    let mounted = true;
    const subscription = shareCapture.onCapture(capture => {
      if (mounted) {
        openSharedCapture(capture);
      }
    });
    void shareCapture.getInitialCapture().then(capture => {
      if (mounted && capture) {
        openSharedCapture(capture);
      }
    }).catch(() => {
      if (mounted) {
        Alert.alert('Share capture failed', 'The shared text could not be opened.');
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [openSharedCapture]);

  useEffect(() => {
    let mounted = true;
    const subscription = launchActions.onAction(action => {
      if (mounted) {
        openLaunchAction(action);
      }
    });
    void launchActions.getInitialAction().then(action => {
      if (mounted && action) {
        openLaunchAction(action);
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [openLaunchAction]);

  useEffect(() => {
    let mounted = true;
    const subscription = deepLinks.onTarget(target => {
      if (mounted) {
        openDeepLink(target);
      }
    });
    void deepLinks.getInitialTarget().then(target => {
      if (mounted && target) {
        openDeepLink(target);
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [openDeepLink]);

  useEffect(() => {
    if (!data || !pendingReminderAction) {
      return;
    }
    const target = pendingReminderAction;
    setPendingReminderAction(null);
    const applyAction = target.action === 'complete'
      ? completeTaskFromReminder(target.taskId)
      : snoozeTaskFromReminder(target.taskId);
    void applyAction.catch(() => {
      Alert.alert('Reminder action failed', target.action === 'complete' ? 'Open the task and complete it manually.' : 'Open the task and set its reminder manually.');
      setPendingTaskId(target.taskId);
    });
  }, [completeTaskFromReminder, data, pendingReminderAction, snoozeTaskFromReminder]);

  if (isLoading || !data) {
    return <LoadingScreen message="Opening your local workspace..." />;
  }

  if (error) {
    return <LoadingScreen message={error} tone="danger" />;
  }

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Yuzuha</Text>
          <Text style={styles.subtitle}>Your private daily desk</Text>
        </View>
        <Text style={styles.version}>Bundle {bundleVersion}</Text>
      </View>

      <View style={styles.content}>
        {sharedCapture ? (
          <SharedCaptureScreen
            capture={sharedCapture}
            addNote={addNote}
            addNoteWithAttachment={addNoteWithAttachment}
            addTask={addTask}
            onDismiss={() => closeSharedCapture()}
            onSaved={closeSharedCapture}
          />
        ) : dataToolsOpen ? (
          <DataToolsScreen data={data} onBack={() => setDataToolsOpen(false)} />
        ) : globalSearchOpen ? (
          <GlobalSearchScreen data={data} onBack={() => setGlobalSearchOpen(false)} onNavigate={openGlobalSearchResult} />
        ) : reviewOpen ? (
          <ReviewScreen data={data} onBack={() => setReviewOpen(false)} onNavigate={setTab} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen data={data} onNavigate={setTab} onOpenDataTools={() => setDataToolsOpen(true)} onOpenSearch={() => setGlobalSearchOpen(true)} onOpenReview={() => setReviewOpen(true)} />}
            {tab === 'money' && <MoneyScreen focusMoneyId={pendingMoneyId} onFocusHandled={() => setPendingMoneyId(null)} />}
            {tab === 'notes' && <NotesScreen focusNoteId={pendingNoteId} onFocusHandled={() => setPendingNoteId(null)} />}
            {tab === 'tasks' && <TasksScreen focusTaskId={pendingTaskId} focusProjectId={pendingProjectId} focusTemplateId={pendingTemplateId} onTaskFocusHandled={() => setPendingTaskId(null)} onProjectFocusHandled={() => setPendingProjectId(null)} onTemplateFocusHandled={() => setPendingTemplateId(null)} />}
            {tab === 'appTime' && <AppTimeScreen onBack={() => setTab('home')} />}
          </>
        )}
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        <TabButton label="Home" icon="⌂" selected={tab === 'home'} onPress={() => setTab('home')} />
        <TabButton label="Money" icon="€" selected={tab === 'money'} onPress={() => setTab('money')} />
        <TabButton label="Notes" icon="✎" selected={tab === 'notes'} onPress={() => setTab('notes')} />
        <TabButton label="Tasks" icon="✓" selected={tab === 'tasks'} onPress={() => setTab('tasks')} />
      </View>
    </SafeAreaView>
  );
}

function SharedCaptureScreen({
  capture,
  addNote,
  addNoteWithAttachment,
  addTask,
  onDismiss,
  onSaved,
}: {
  capture: SharedCapture;
  addNote: (input: {title: string; body: string; tags: string[]}) => Promise<void>;
  addNoteWithAttachment: (input: {title: string; body: string; tags: string[]}, source: {uri: string; name?: string | null; type?: string | null}) => Promise<void>;
  addTask: (input: {title: string; details: string; dueLocalDate: string | null; priority: 'normal'; listId: string}) => Promise<string>;
  onDismiss: () => void;
  onSaved: (tab: Tab) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const noteTitle = sharedCaptureTitle(capture, capture.attachment ? 'Shared file' : 'Shared note');
  const taskTitle = sharedCaptureTitle(capture, 'Shared task');

  const saveAsNote = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (capture.attachment) {
        await addNoteWithAttachment(
          {title: noteTitle, body: capture.text, tags: []},
          {uri: capture.attachment.uri, name: capture.attachment.name, type: capture.attachment.mimeType},
        );
      } else {
        await addNote({title: noteTitle, body: capture.text, tags: []});
      }
      onSaved('notes');
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : 'The note could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAsTask = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await addTask({title: taskTitle, details: capture.text, dueLocalDate: null, priority: 'normal', listId: TASK_INBOX_LIST_ID});
      onSaved('tasks');
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : 'The task could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Shared capture</Text>
      <Text style={styles.pageIntro}>Review this shared content before saving it to your local workspace.</Text>
      <View style={styles.formCard}>
        {capture.subject && <Text style={styles.cardTitle}>{capture.subject}</Text>}
        {capture.text && <Text style={styles.noteBody}>{capture.text}</Text>}
        {capture.attachment && (
          <View style={styles.importPreview}>
            <Text style={styles.cardTitle}>Attachment</Text>
            <Text style={styles.listTitle}>{capture.attachment.name}</Text>
            <Text style={styles.listMeta}>{capture.attachment.mimeType} · {capture.attachment.byteSize === null ? 'Size checked on save' : `${capture.attachment.byteSize} bytes`}</Text>
          </View>
        )}
      </View>
      {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      <PrimaryButton label="Save as note" onPress={() => void saveAsNote()} disabled={isSaving} />
      {!capture.attachment && <TextButton label="Save as task" onPress={() => void saveAsTask()} disabled={isSaving} />}
      <TextButton label="Dismiss" onPress={onDismiss} disabled={isSaving} />
    </ScrollView>
  );
}

function LoadingScreen({message, tone = 'normal'}: {message: string; tone?: 'normal' | 'danger'}) {
  return (
    <SafeAreaView style={styles.loading}>
      <Text style={styles.brand}>Yuzuha</Text>
      <Text style={[styles.loadingMessage, tone === 'danger' && styles.dangerText]}>{message}</Text>
    </SafeAreaView>
  );
}

function HomeScreen({
  data,
  onNavigate,
  onOpenDataTools,
  onOpenSearch,
  onOpenReview,
}: {
  data: AppData;
  onNavigate: (tab: Tab) => void;
  onOpenDataTools: () => void;
  onOpenSearch: () => void;
  onOpenReview: () => void;
}) {
  const {setWeekStartsOn} = useAppStore();
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [homePeriod, setHomePeriod] = useState<Period>('day');
  const [weekStartError, setWeekStartError] = useState<string | null>(null);
  const range = getPeriodRange(new Date(), homePeriod, data.weekStartsOn);
  const selectedPeriodLabel = periodLabel(homePeriod);
  const periodDates = getLocalDateKeys(range);
  const periodMoney = data.money.filter(entry => entry.currency === data.mainCurrency && isInPeriod(entry.occurredAt, range));
  const expenses = sumMoney(periodMoney, 'expense');
  const income = sumMoney(periodMoney, 'income');
  const openTasks = data.tasks.filter(task => task.status === 'open').length;
  const dueTasks = data.tasks.filter(task => task.status === 'open' && task.dueLocalDate !== null && periodDates.has(task.dueLocalDate)).length;
  const activeNotes = filterNotes(data.notes, '', false);
  const recentNotes = activeNotes.filter(note => isInPeriod(note.updatedAt, range)).slice(0, 3);
  const appTimeSeconds = sumUsage(data.usageSnapshots, periodDates);
  const hasUsagePermission = data.usageRead.permission === 'granted';

  async function saveWeekStart(weekStartsOn: WeekStartDay) {
    setWeekStartError(null);
    try {
      await setWeekStartsOn(weekStartsOn);
    } catch (error) {
      setWeekStartError(error instanceof Error ? error.message : 'The week start could not be saved.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{selectedPeriodLabel}</Text>
      <Text style={styles.pageIntro}>A small, honest view of what is in your workspace.</Text>
      <TextButton label="Search everything" onPress={onOpenSearch} />
      <TextButton label="Export, restore, or delete data" onPress={onOpenDataTools} />
      <TextButton label="Review this period" onPress={onOpenReview} />
      <TextButton label={quickCaptureOpen ? 'Close quick capture' : 'Quick capture'} onPress={() => setQuickCaptureOpen(current => !current)} />
      {quickCaptureOpen && (
        <View style={styles.segmentRow}>
          {QUICK_CAPTURE_OPTIONS.map(option => (
            <TextButton key={option.target} label={option.label} onPress={() => {setQuickCaptureOpen(false); onNavigate(option.target);}} />
          ))}
        </View>
      )}

      <SectionTitle title="Dashboard period" />
      <View style={styles.formCard}>
        <Text style={styles.cardDetail}>Selected range: {formatPeriodRange(range)}. Cards use this local range; no background refresh is added.</Text>
        <View style={styles.segmentRow}>
          <SegmentButton label="Day" selected={homePeriod === 'day'} onPress={() => setHomePeriod('day')} />
          <SegmentButton label="Week" selected={homePeriod === 'week'} onPress={() => setHomePeriod('week')} />
          <SegmentButton label="Month" selected={homePeriod === 'month'} onPress={() => setHomePeriod('month')} />
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Week starts on</Text>
        <Text style={styles.cardDetail}>Week-based Home, Money, App Time, Review, and budget views use this local setting.</Text>
        <View style={styles.segmentRow}>
          <SegmentButton label="Sunday" selected={data.weekStartsOn === 0} onPress={() => void saveWeekStart(0)} />
          <SegmentButton label="Monday" selected={data.weekStartsOn === 1} onPress={() => void saveWeekStart(1)} />
        </View>
        {weekStartError && <Text style={styles.errorText}>{weekStartError}</Text>}
      </View>

      <View style={styles.cardGrid}>
        <SummaryCard
          title="Money"
          value={formatMoney(expenses, data.mainCurrency)}
          detail={`${formatMoney(income, data.mainCurrency)} income ${selectedPeriodLabel.toLowerCase()}`}
          action="Open money"
          onPress={() => onNavigate('money')}
        />
        <SummaryCard
          title="App time"
          value={hasUsagePermission ? formatDuration(appTimeSeconds) : 'Not connected'}
          detail={hasUsagePermission ? `${selectedPeriodLabel} from Android Usage Access.` : `Connect Android Usage Access to read ${selectedPeriodLabel.toLowerCase()}.`}
          action={hasUsagePermission ? 'Open app time' : 'Set up access'}
          onPress={() => onNavigate('appTime')}
        />
        <SummaryCard
          title="Tasks"
          value={`${openTasks} open`}
          detail={openTasks === 0 ? 'All clear for now.' : `${dueTasks} due ${selectedPeriodLabel.toLowerCase()}.`}
          action="Open tasks"
          onPress={() => onNavigate('tasks')}
        />
        <SummaryCard
          title="Notes"
          value={`${activeNotes.length} active`}
          detail={recentNotes[0]?.title ?? 'Capture your first thought.'}
          action="Open notes"
          onPress={() => onNavigate('notes')}
        />
      </View>

      <SectionTitle title={`Recent notes ${selectedPeriodLabel.toLowerCase()}`} />
      {recentNotes.length === 0 ? (
        <EmptyState text={`No notes updated ${selectedPeriodLabel.toLowerCase()}. Use Notes to keep a small record of what matters.`} />
      ) : (
        recentNotes.map(note => (
          <View key={note.id} style={styles.listRow}>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{note.title}</Text>
              <Text style={styles.listMeta}>{formatDate(note.updatedAt)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ReviewScreen({data, onBack, onNavigate}: {data: AppData; onBack: () => void; onNavigate: (tab: Tab) => void}) {
  const [reviewPeriod, setReviewPeriod] = useState<Period>('day');
  const range = getPeriodRange(new Date(), reviewPeriod, data.weekStartsOn);
  const summary = buildReviewSummary(data, range);
  const selectedPeriodLabel = periodLabel(reviewPeriod);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TextButton label="Back to home" onPress={onBack} />
      <Text style={styles.pageTitle}>{selectedPeriodLabel} review</Text>
      <Text style={styles.pageIntro}>Source-backed local totals for {formatPeriodRange(range)}. This review does not write data or refresh Android usage.</Text>
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Review period</Text>
        <View style={styles.segmentRow}>
          <SegmentButton label="Day" selected={reviewPeriod === 'day'} onPress={() => setReviewPeriod('day')} />
          <SegmentButton label="Week" selected={reviewPeriod === 'week'} onPress={() => setReviewPeriod('week')} />
          <SegmentButton label="Month" selected={reviewPeriod === 'month'} onPress={() => setReviewPeriod('month')} />
        </View>
      </View>

      <SummaryCard
        title="Money"
        value={formatMoney(summary.expenseMinor, data.mainCurrency)}
        detail={`${formatMoney(summary.incomeMinor, data.mainCurrency)} income. Main currency only.`}
        action="Open money"
        onPress={() => {onBack(); onNavigate('money');}}
      />
      <SummaryCard
        title="App time"
        value={summary.usagePermission === 'granted' ? formatDuration(summary.appTimeSeconds) : 'Not connected'}
        detail={summary.usagePermission === 'granted' ? `Android Usage Access. ${summary.usageLastReadAt ? `Last read ${formatDate(summary.usageLastReadAt)}.` : 'No read yet.'}` : 'Allow Android Usage Access to include app time.'}
        action="Open app time"
        onPress={() => {onBack(); onNavigate('appTime');}}
      />
      <SummaryCard
        title="Tasks"
        value={`${summary.openDueTaskCount} due`}
        detail={`${summary.completedTaskCount} completed in this period. ${summary.overdueOpenTaskCount} overdue now.`}
        action="Open tasks"
        onPress={() => {onBack(); onNavigate('tasks');}}
      />
      <SummaryCard
        title="Notes"
        value={`${summary.updatedNoteCount} updated`}
        detail={`${summary.activeNoteCount} active notes on this device.`}
        action="Open notes"
        onPress={() => {onBack(); onNavigate('notes');}}
      />
    </ScrollView>
  );
}

function GlobalSearchScreen({data, onBack, onNavigate}: {data: AppData; onBack: () => void; onNavigate: (navigation: GlobalSearchNavigation) => void}) {
  const [query, setQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const results = searchGlobal(data, query, {includeArchived});

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TextButton label="Back to home" onPress={onBack} />
        <Text style={styles.pageTitle}>Search</Text>
        <Text style={styles.pageIntro}>Search local notes, tasks, money, and other workspace records. Search stays on this device.</Text>
        <TextInput
          accessibilityLabel="Global search"
          placeholder="Search your workspace"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        <TextButton
          label={includeArchived ? 'Hide archived results' : 'Include archived results'}
          onPress={() => setIncludeArchived(current => !current)}
        />
        <Text style={styles.searchAccessNote}>App-time results appear only when Usage Access is granted and the snapshot is included.</Text>
        {!query.trim() ? (
          <EmptyState text="Type a word to search your local workspace." />
        ) : results.length === 0 ? (
          <EmptyState text="No matches in the selected records." />
        ) : (
          <View>
            <SectionTitle title={`${results.length} result${results.length === 1 ? '' : 's'}`} />
            {results.map(result => (
              <Pressable
                key={`${result.kind}:${result.id}`}
                accessibilityLabel={`Open ${globalSearchKindLabel(result.kind)} ${result.title}`}
                accessibilityRole="button"
                style={({pressed}) => [styles.searchResultRow, pressed && styles.pressed]}
                onPress={() => {
                  onNavigate(globalSearchNavigation(result));
                  onBack();
                }}>
                <Text style={styles.searchResultKind}>{globalSearchKindLabel(result.kind)}</Text>
                <Text style={styles.listTitle}>{result.title}</Text>
                <Text style={styles.listMeta}>{result.detail}{result.isArchived ? ' · archived' : ''}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function globalSearchKindLabel(kind: GlobalSearchKind): string {
  switch (kind) {
    case 'app-group':
      return 'App group';
    case 'saved-search':
      return 'Saved search';
    case 'time-goal':
      return 'Time goal';
    case 'usage':
      return 'App time';
    case 'money':
      return 'Money';
    case 'note':
      return 'Note';
    case 'focus-session':
      return 'Focus session';
    case 'project':
      return 'Project';
    case 'task':
      return 'Task';
    case 'task-template':
      return 'Task template';
    case 'task-list':
      return 'Task list';
    case 'account':
      return 'Account';
    case 'category':
      return 'Category';
    case 'transfer':
      return 'Transfer';
    case 'split':
      return 'Split entry';
    case 'budget':
      return 'Budget';
    case 'recurrence':
      return 'Recurring money';
  }
}

function DataToolsScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {resetWorkspace, restoreWorkspace, importMoneyEntries, undoMoneyCsvImport} = useAppStore();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<JsonImportPreview | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupText, setBackupText] = useState('');
  const [backupPreview, setBackupPreview] = useState<EncryptedBackupPreview | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryKeyConfirmation, setRecoveryKeyConfirmation] = useState('');
  const [moneyCsvPreview, setMoneyCsvPreview] = useState<MoneyCsvImportFilePreview | null>(null);
  const [moneyCsvBusy, setMoneyCsvBusy] = useState(false);
  const [moneyCsvUndoBusy, setMoneyCsvUndoBusy] = useState(false);
  const [jsonFilePreview, setJsonFilePreview] = useState<JsonImportFilePreview | null>(null);
  const [jsonFileBusy, setJsonFileBusy] = useState(false);

  async function shareJson() {
    try {
      await Share.share({
        title: 'Yuzuha JSON export',
        message: buildJsonExport(data, new Date().toISOString()),
      });
      setError(null);
      setStatus('JSON export is ready to share.');
    } catch {
      setStatus(null);
      setError('JSON export could not be opened for sharing.');
    }
  }

  async function shareCsv() {
    try {
      await Share.share({
        title: 'Yuzuha money CSV export',
        message: buildMoneyCsvExport(data),
      });
      setError(null);
      setStatus('Money CSV export is ready to share.');
    } catch {
      setStatus(null);
      setError('Money CSV export could not be opened for sharing.');
    }
  }

  async function previewMoneyCsvImport() {
    setStatus(null);
    setError(null);
    setMoneyCsvPreview(null);
    setMoneyCsvBusy(true);
    try {
      const preview = await openMoneyCsvImportFile(data);
      setMoneyCsvPreview(preview);
      setStatus(`${preview.name} is validated. Review the rows before importing.`);
    } catch (importError) {
      if (!(importError instanceof MoneyCsvImportFileCanceled)) {
        setMoneyCsvPreview(null);
        setError(importError instanceof Error ? importError.message : 'Money CSV import could not be opened.');
      }
    } finally {
      setMoneyCsvBusy(false);
    }
  }

  function confirmMoneyCsvImport() {
    if (!moneyCsvPreview || moneyCsvPreview.errors.length > 0 || moneyCsvPreview.entries.length === 0) {
      return;
    }
    Alert.alert(
      'Import money entries?',
      `Add ${moneyCsvPreview.entries.length} entries from ${moneyCsvPreview.name} to this workspace. Existing records will stay unchanged.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Import',
          onPress: () => {
            void importMoneyEntries(moneyCsvPreview.entries, moneyCsvPreview.name)
              .then(() => {
                setError(null);
                setStatus(`${moneyCsvPreview.entries.length} money entries were imported.`);
                setMoneyCsvPreview(null);
              })
              .catch(importError => {
                setStatus(null);
                setError(importError instanceof Error ? importError.message : 'Money CSV import failed.');
              });
          },
        },
      ],
    );
  }

  function confirmUndoMoneyCsvImport() {
    if (!data.lastMoneyCsvImport) {
      return;
    }
    Alert.alert(
      'Undo latest money CSV import?',
      `Remove ${data.lastMoneyCsvImport.entries.length} entries from ${data.lastMoneyCsvImport.sourceName}? This works only while those imported entries are unchanged.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Undo import',
          style: 'destructive',
          onPress: () => {
            setMoneyCsvUndoBusy(true);
            void undoMoneyCsvImport()
              .then(() => {
                setError(null);
                setStatus('The latest money CSV import was undone.');
              })
              .catch(undoError => {
                setStatus(null);
                setError(undoError instanceof Error ? undoError.message : 'The latest money CSV import could not be undone.');
              })
              .finally(() => setMoneyCsvUndoBusy(false));
          },
        },
      ],
    );
  }

  async function shareEncryptedBackup() {
    setStatus(null);
    setError(null);
    setBackupBusy(true);
    try {
      const attachmentFiles = await readAttachmentBackupFiles(data.attachments);
      const backup = await buildEncryptedBackup(data, backupPassword, new Date().toISOString(), undefined, attachmentFiles);
      await Share.share({
        title: 'Yuzuha encrypted backup',
        message: backup,
      });
      setStatus('Encrypted backup is ready to share. The password is not stored on this device.');
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Encrypted backup could not be created.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function saveEncryptedBackupFileToDevice() {
    setStatus(null);
    setError(null);
    setBackupBusy(true);
    try {
      const attachmentFiles = await readAttachmentBackupFiles(data.attachments);
      const savedFile = await saveEncryptedBackupFile(data, backupPassword, new Date().toISOString(), attachmentFiles);
      setStatus(`Encrypted backup saved as ${savedFile.name}. The password is not stored on this device.`);
    } catch (backupError) {
      if (!(backupError instanceof EncryptedBackupFileCanceled)) {
        setError(backupError instanceof Error ? backupError.message : 'Encrypted backup file could not be saved.');
      }
    } finally {
      setBackupBusy(false);
    }
  }

  function createRecoveryKey() {
    setStatus(null);
    setError(null);
    try {
      setRecoveryKey(generateRecoveryKey());
      setRecoveryKeyConfirmation('');
      setStatus('Recovery key generated. Write it down before continuing; it is not stored on this device.');
    } catch (recoveryError) {
      setError(recoveryError instanceof Error ? recoveryError.message : 'A recovery key could not be generated.');
    }
  }

  async function saveRecoveryBackupFileToDevice() {
    setStatus(null);
    setError(null);
    const confirmedKey = getConfirmedRecoveryKey(recoveryKey, recoveryKeyConfirmation);
    if (!confirmedKey) {
      setError('Enter the recovery key again before saving this backup.');
      return;
    }
    setBackupBusy(true);
    try {
      const attachmentFiles = await readAttachmentBackupFiles(data.attachments);
      const savedFile = await saveRecoveryEncryptedBackupFile(data, confirmedKey, new Date().toISOString(), attachmentFiles);
      setStatus(`Recovery-key backup saved as ${savedFile.name}. The recovery key is not stored on this device.`);
    } catch (backupError) {
      if (!(backupError instanceof EncryptedBackupFileCanceled)) {
        setError(backupError instanceof Error ? backupError.message : 'Recovery-key backup could not be saved.');
      }
    } finally {
      setBackupBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete local data?',
      'This removes your money, notes, tasks, app-time history, budgets, accounts, and categories from this device. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void resetWorkspace()
              .then(() => {
                setError(null);
                setStatus('Local data was deleted from this device.');
              })
              .catch(() => {
                setStatus(null);
                setError('Local data could not be deleted.');
              });
          },
        },
      ],
    );
  }

  function previewRestore() {
    setStatus(null);
    setError(null);
    setJsonFilePreview(null);
    try {
      setImportPreview(parseJsonImport(importText));
    } catch (restoreError) {
      setImportPreview(null);
      setError(restoreError instanceof Error ? restoreError.message : 'The JSON export could not be validated.');
    }
  }

  async function openJsonImportFileFromDevice() {
    setStatus(null);
    setError(null);
    setImportPreview(null);
    setJsonFilePreview(null);
    setJsonFileBusy(true);
    try {
      const preview = await openJsonImportFile();
      setJsonFilePreview(preview);
      setImportPreview(preview);
      setStatus(`${preview.name} is validated. Review the records before restoring.`);
    } catch (fileError) {
      if (!(fileError instanceof JsonImportFileCanceled)) {
        setError(fileError instanceof Error ? fileError.message : 'The JSON export could not be opened.');
      }
    } finally {
      setJsonFileBusy(false);
    }
  }

  function confirmRestore() {
    if (!importPreview) {
      return;
    }
    Alert.alert(
      'Replace local workspace?',
      `This will replace local data with ${importPreview.totalRecords} imported records. The current workspace will be overwritten.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            void restoreWorkspace(importPreview.data)
              .then(() => {
                setError(null);
                setStatus('Workspace restored from the validated JSON export.');
                setImportText('');
                setImportPreview(null);
                setJsonFilePreview(null);
              })
              .catch(() => {
                setStatus(null);
                setError('Workspace restore failed. The current workspace was kept.');
              });
          },
        },
      ],
    );
  }

  async function previewEncryptedRestore() {
    setStatus(null);
    setError(null);
    setBackupBusy(true);
    try {
      setBackupPreview(await decryptEncryptedBackup(backupText, backupPassword));
    } catch (backupError) {
      setBackupPreview(null);
      setError(backupError instanceof Error ? backupError.message : 'The encrypted backup could not be opened.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function openEncryptedBackupFileFromDevice() {
    setStatus(null);
    setError(null);
    setBackupBusy(true);
    try {
      setBackupPreview(await openEncryptedBackupFile(backupPassword));
      setStatus('Encrypted backup file is validated. Review the preview before restoring it.');
    } catch (backupError) {
      if (!(backupError instanceof EncryptedBackupFileCanceled)) {
        setBackupPreview(null);
        setError(backupError instanceof Error ? backupError.message : 'Encrypted backup file could not be opened.');
      }
    } finally {
      setBackupBusy(false);
    }
  }

  function confirmEncryptedRestore() {
    if (!backupPreview) {
      return;
    }
    Alert.alert(
      'Replace local workspace?',
      `This will replace local data with ${backupPreview.totalRecords} decrypted records from ${backupPreview.createdAt}. The current workspace will be overwritten.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            void restoreEncryptedWorkspace(backupPreview)
              .then(() => {
                setError(null);
                setStatus('Workspace restored from the validated encrypted backup.');
                setBackupText('');
                setBackupPassword('');
                setBackupPreview(null);
              })
              .catch(() => {
                setStatus(null);
                setError('Workspace restore failed. The current workspace was kept.');
              });
          },
        },
      ],
    );
  }

  async function restoreEncryptedWorkspace(preview: EncryptedBackupPreview) {
    const attachmentStage = await stageAttachmentBackupFiles(preview.data.attachments, preview.attachmentFiles);
    await restoreWorkspace(preview.data, attachmentStage);
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Pressable accessibilityLabel="Back to Home" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>‹ Home</Text>
      </Pressable>
      <Text style={styles.pageTitle}>Data tools</Text>
      <Text style={styles.pageIntro}>Exports include supported local records. Restore validates a JSON export and shows a preview before replacing this workspace.</Text>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Export</Text>
        <PrimaryButton label="Share JSON export" onPress={shareJson} />
        <PrimaryButton label="Share money CSV" onPress={shareCsv} />
        <Text style={styles.formLabel}>Encrypted backup password</Text>
        <TextInput
          accessibilityLabel="Encrypted backup password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="At least 12 characters"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={backupPassword}
          onChangeText={setBackupPassword}
        />
        <PrimaryButton label="Share encrypted backup" onPress={shareEncryptedBackup} disabled={backupBusy} />
        <PrimaryButton label="Save encrypted backup file" onPress={saveEncryptedBackupFileToDevice} disabled={backupBusy} />
        <Text style={styles.formLabel}>Recovery-key backup</Text>
        <Text style={styles.cardDetail}>Create a separate encrypted backup that uses a high-entropy recovery key. Write the key down and confirm it before saving; Yuzuha does not store it.</Text>
        <PrimaryButton label={recoveryKey ? 'Generate a new recovery key' : 'Generate recovery key'} onPress={createRecoveryKey} disabled={backupBusy} />
        {!!recoveryKey && (
          <>
            <Text accessibilityLabel="Generated recovery key" style={styles.recoveryKey}>{recoveryKey}</Text>
            <TextInput
              accessibilityLabel="Recovery key confirmation"
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Enter the recovery key again"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={recoveryKeyConfirmation}
              onChangeText={setRecoveryKeyConfirmation}
            />
            <PrimaryButton
              label="Save recovery-key backup file"
              onPress={saveRecoveryBackupFileToDevice}
              disabled={backupBusy}
            />
          </>
        )}
        {status && <Text style={styles.successText}>{status}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Import money CSV</Text>
        <Text style={styles.cardDetail}>Choose a current Yuzuha money CSV. Nothing changes until you review the rows and confirm the append. Split-linked rows need a JSON export or encrypted backup.</Text>
        <PrimaryButton label={moneyCsvBusy ? 'Opening money CSV...' : 'Choose money CSV'} onPress={previewMoneyCsvImport} disabled={moneyCsvBusy || moneyCsvUndoBusy || backupBusy} />
        {moneyCsvPreview && (
          <View style={styles.importPreview}>
            <Text style={styles.cardTitle}>Money CSV preview</Text>
            <Text style={styles.cardDetail}>{formatMoneyCsvImportPreview(moneyCsvPreview)}</Text>
            {moneyCsvPreview.errors.length === 0 && moneyCsvPreview.entries.length > 0 && (
              <PrimaryButton label="Import these money entries" onPress={confirmMoneyCsvImport} />
            )}
          </View>
        )}
        {data.lastMoneyCsvImport ? (
          <View style={styles.importPreview}>
            <Text style={styles.cardTitle}>Latest import</Text>
            <Text style={styles.cardDetail}>{data.lastMoneyCsvImport.entries.length} entries from {data.lastMoneyCsvImport.sourceName}. Imported {formatDate(data.lastMoneyCsvImport.importedAt)}. Undo is blocked after an imported entry is edited or deleted.</Text>
            <PrimaryButton label={moneyCsvUndoBusy ? 'Undoing import...' : 'Undo latest money CSV import'} onPress={confirmUndoMoneyCsvImport} disabled={moneyCsvBusy || moneyCsvUndoBusy || backupBusy} />
          </View>
        ) : (
          <Text style={styles.cardDetail}>No money CSV import is available to undo.</Text>
        )}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Restore JSON export</Text>
        <Text style={styles.cardDetail}>Choose or paste a current Yuzuha JSON export. Nothing changes until you review the count and confirm the replacement.</Text>
        <PrimaryButton label={jsonFileBusy ? 'Opening JSON export...' : 'Choose JSON export file'} onPress={openJsonImportFileFromDevice} disabled={jsonFileBusy || backupBusy} />
        <TextInput
          accessibilityLabel="JSON restore text"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={value => {
            setImportText(value);
            setImportPreview(null);
            setJsonFilePreview(null);
            setStatus(null);
          }}
          placeholder="Paste JSON export"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multilineInput]}
          value={importText}
        />
        <PrimaryButton label="Preview restore" onPress={previewRestore} />
        {importPreview && (
          <View style={styles.importPreview}>
            <Text style={styles.cardTitle}>Validated preview</Text>
            <Text style={styles.cardDetail}>{jsonFilePreview ? `${jsonFilePreview.name}\n\n${formatImportPreview(importPreview)}` : formatImportPreview(importPreview)}</Text>
            <PrimaryButton label="Restore this workspace" onPress={confirmRestore} />
          </View>
        )}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Restore encrypted backup</Text>
        <Text style={styles.cardDetail}>Paste the encrypted backup and enter its password or recovery key. The backup is decrypted and validated before any local data changes.</Text>
        <PrimaryButton label="Open encrypted backup file" onPress={openEncryptedBackupFileFromDevice} disabled={backupBusy} />
        <TextInput
          accessibilityLabel="Encrypted backup text"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={value => {
            setBackupText(value);
            setBackupPreview(null);
            setStatus(null);
          }}
          placeholder="Paste encrypted backup"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multilineInput]}
          value={backupText}
        />
        <TextInput
          accessibilityLabel="Encrypted restore password or recovery key"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Password or recovery key"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={backupPassword}
          onChangeText={value => {
            setBackupPassword(value);
            setBackupPreview(null);
          }}
        />
        <PrimaryButton label={backupBusy ? 'Opening encrypted backup...' : 'Preview encrypted restore'} onPress={previewEncryptedRestore} disabled={backupBusy} />
        {backupPreview && (
          <View style={styles.importPreview}>
            <Text style={styles.cardTitle}>Validated encrypted preview</Text>
            <Text style={styles.cardDetail}>Created: {backupPreview.createdAt}. Credential: {backupPreview.credential === 'recovery-key' ? 'recovery key' : 'password'}. Encrypted bytes: {backupPreview.encryptedBytes}.</Text>
            <Text style={styles.cardDetail}>{formatImportPreview(backupPreview)}</Text>
            <PrimaryButton label="Restore encrypted workspace" onPress={confirmEncryptedRestore} />
          </View>
        )}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Delete</Text>
        <Text style={styles.cardDetail}>Delete removes local records and keeps only the empty workspace defaults.</Text>
        <TextButton label="Delete all local data" danger onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

function formatImportPreview(preview: JsonImportPreview): string {
  const labels: Array<[keyof JsonImportPreview['recordCounts'], string]> = [
    ['money', 'money'],
    ['transfers', 'transfers'],
    ['splits', 'splits'],
    ['budgets', 'budgets'],
    ['recurrences', 'recurring rules'],
    ['accounts', 'accounts'],
    ['categories', 'categories'],
    ['notes', 'notes'],
    ['noteLinks', 'note links'],
    ['attachments', 'attachments'],
    ['savedSearches', 'saved searches'],
    ['projects', 'projects'],
    ['appGroups', 'app groups'],
    ['tasks', 'tasks'],
    ['focusSessions', 'focus sessions'],
    ['usageSnapshots', 'app-time records'],
    ['timeGoals', 'time goals'],
  ];
  const summary = labels
    .filter(([key]) => preview.recordCounts[key] > 0)
    .map(([key, label]) => `${preview.recordCounts[key]} ${label}`);
  return `${preview.totalRecords} total records${summary.length > 0 ? `: ${summary.join(', ')}` : '.'}`;
}

function formatMoneyCsvImportPreview(preview: MoneyCsvImportFilePreview): string {
  const income = formatMinorTotals(preview.incomeMinorByCurrency);
  const expense = formatMinorTotals(preview.expenseMinorByCurrency);
  const rowLabel = preview.entries.length === 1 ? 'row' : 'rows';
  if (preview.errors.length > 0) {
    return `${preview.rowCount} rows found. ${preview.entries.length} valid ${rowLabel}; import is blocked until you choose a corrected file.\n\n${preview.errors.join('\n')}`;
  }
  return `${preview.entries.length} new ${rowLabel}. Income: ${income}. Expenses: ${expense}. Existing workspace records stay unchanged.`;
}

function formatMinorTotals(totals: Record<string, number>): string {
  const formatted = Object.entries(totals).map(([currency, amountMinor]) => formatMoney(amountMinor, currency));
  return formatted.length > 0 ? formatted.join(', ') : 'none';
}

function appTimeTopAppsLabel(period: Period): string {
  if (period === 'week') {
    return 'Top apps this week';
  }
  if (period === 'month') {
    return 'Top apps this month';
  }
  return 'Top apps today';
}

function getConfirmedRecoveryKey(generatedKey: string, confirmation: string): string | null {
  if (!generatedKey || !confirmation) {
    return null;
  }
  try {
    const normalizedGeneratedKey = normalizeRecoveryKey(generatedKey);
    const normalizedConfirmation = normalizeRecoveryKey(confirmation);
    return normalizedGeneratedKey === normalizedConfirmation ? normalizedGeneratedKey : null;
  } catch {
    return null;
  }
}

function MoneyScreen({focusMoneyId, onFocusHandled}: {focusMoneyId: string | null; onFocusHandled: () => void}) {
  const {
    data,
    addMoney,
    updateMoney,
    deleteMoney,
    addMoneyAccount,
    addMoneyCategory,
    addMoneyPayee,
    archiveMoneyAccount,
    archiveMoneyCategory,
    archiveMoneyPayee,
  } = useAppStore();
  const [kind, setKind] = useState<MoneyKind>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [note, setNote] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newPayee, setNewPayee] = useState('');
  const [payeeError, setPayeeError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'entry' | 'budget' | 'split' | 'transfer' | 'report' | 'recurrence'>('entry');
  const [entryFilterPeriod, setEntryFilterPeriod] = useState<MoneyFilterPeriod>(emptyMoneyEntryFilter.period);
  const [entryFilterKind, setEntryFilterKind] = useState<MoneyKind | 'all'>(emptyMoneyEntryFilter.kind);
  const [entryFilterCategoryId, setEntryFilterCategoryId] = useState<string | 'all'>(emptyMoneyEntryFilter.categoryId);
  const [entryFilterAccountId, setEntryFilterAccountId] = useState<string | 'all'>(emptyMoneyEntryFilter.accountId);

  useEffect(() => {
    if (!focusMoneyId || !data) {
      return;
    }
    const entry = data.money.find(item => item.id === focusMoneyId);
    if (!entry) {
      onFocusHandled();
      return;
    }
    setView('entry');
    setEditingId(entry.id);
    setKind(entry.kind);
    setAmount((entry.amountMinor / 100).toFixed(2));
    setCategoryId(entry.categoryId ?? '');
    setAccountId(entry.accountId ?? '');
    setPayeeId(entry.payeeId ?? '');
    setNote(entry.note);
    setError(null);
    onFocusHandled();
  }, [data, focusMoneyId, onFocusHandled]);

  if (!data) {
    return null;
  }
  const currentData = data;

  if (view === 'report') {
    return <MoneyReportScreen data={currentData} onBack={() => setView('entry')} />;
  }
  if (view === 'transfer') {
    return <MoneyTransferScreen data={currentData} onBack={() => setView('entry')} />;
  }
  if (view === 'split') {
    return <MoneySplitScreen data={currentData} onBack={() => setView('entry')} />;
  }
  if (view === 'budget') {
    return <MoneyBudgetScreen data={currentData} onBack={() => setView('entry')} />;
  }
  if (view === 'recurrence') {
    return <MoneyRecurrenceScreen data={currentData} onBack={() => setView('entry')} />;
  }

  async function save() {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setError(null);
    const selectedCategory =
      currentData.categories.find(item => item.id === categoryId && (item.kind === kind || item.kind === 'both')) ??
      currentData.categories.find(item => item.kind === kind || item.kind === 'both');
    const selectedAccount = currentData.accounts.find(item => item.id === accountId) ?? currentData.accounts[0];
    const input = {
      kind,
      amountMinor: Math.round(parsed * 100),
      currency: selectedAccount?.currency ?? currentData.mainCurrency,
      accountId: selectedAccount?.id ?? null,
      categoryId: selectedCategory?.id ?? null,
      payeeId: payeeId || null,
      category: selectedCategory?.name ?? 'Uncategorized',
      note: note.trim(),
    };
    if (editingId) {
      await updateMoney(editingId, input);
    } else {
      await addMoney(input);
    }
    resetForm();
  }

  function resetForm() {
    setAmount('');
    setPayeeId('');
    setNote('');
    setEditingId(null);
    setError(null);
  }

  function startEdit(entry: AppData['money'][number]) {
    setEditingId(entry.id);
    setKind(entry.kind);
    setAmount((entry.amountMinor / 100).toFixed(2));
    setCategoryId(entry.categoryId ?? '');
    setAccountId(entry.accountId ?? '');
    setPayeeId(entry.payeeId ?? '');
    setNote(entry.note);
    setError(null);
  }

  async function removeEditing() {
    if (!editingId) {
      return;
    }
    await deleteMoney(editingId);
    resetForm();
  }

  async function saveCategory() {
    const name = newCategory.trim();
    if (!name) {
      return;
    }
    await addMoneyCategory(name, kind);
    setNewCategory('');
  }

  async function saveAccount() {
    const name = newAccount.trim();
    if (!name) {
      return;
    }
    await addMoneyAccount(name, currentData.mainCurrency);
    setNewAccount('');
  }

  async function savePayee() {
    const name = newPayee.trim();
    if (!name) {
      setPayeeError('Enter a payee name.');
      return;
    }
    try {
      await addMoneyPayee(name);
      setNewPayee('');
      setPayeeError(null);
    } catch (nextError) {
      setPayeeError(nextError instanceof Error ? nextError.message : 'The payee could not be saved.');
    }
  }

  const visibleCategories = data.categories.filter(
    item => !item.isArchived && (item.kind === kind || item.kind === 'both'),
  );
  const activeCategoryId = categoryId || visibleCategories[0]?.id;
  const activeAccountId = accountId || data.accounts.find(account => !account.isArchived)?.id;
  const visiblePayees = data.payees.filter(payee => !payee.isArchived || payee.id === payeeId);
  const payeeNames = new Map(data.payees.map(payee => [payee.id, payee.name]));
  const entryFilter = {
    period: entryFilterPeriod,
    kind: entryFilterKind,
    categoryId: entryFilterCategoryId,
    accountId: entryFilterAccountId,
  } as const;
  const listSourceEntries = data.money.filter(
    entry => !entry.splitId && !data.splits.some(split => split.parentEntryId === entry.id),
  );
  const listEntries = filterMoneyEntries(listSourceEntries, entryFilter, new Date(), data.weekStartsOn);
  const filteredTotals = summarizeMoneyEntries(listEntries);
  const filterCategories = data.categories.filter(category => !category.isArchived || category.id === entryFilterCategoryId);
  const filterAccounts = data.accounts.filter(account => !account.isArchived || account.id === entryFilterAccountId);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Money</Text>
        <Text style={styles.pageIntro}>Manual entries stay on this device.</Text>
        <TextButton label="Open budgets" onPress={() => setView('budget')} />
        <TextButton label="Add split entry" onPress={() => setView('split')} />
        <TextButton label="Add transfer" onPress={() => setView('transfer')} />
        <TextButton label="Add recurring rule" onPress={() => setView('recurrence')} />
        <TextButton label="Open money report" onPress={() => setView('report')} />
        <SectionTitle title="Entry filters" />
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Period</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="All" selected={entryFilterPeriod === 'all'} onPress={() => setEntryFilterPeriod('all')} />
            <SegmentButton label="Day" selected={entryFilterPeriod === 'day'} onPress={() => setEntryFilterPeriod('day')} />
            <SegmentButton label="Week" selected={entryFilterPeriod === 'week'} onPress={() => setEntryFilterPeriod('week')} />
            <SegmentButton label="Month" selected={entryFilterPeriod === 'month'} onPress={() => setEntryFilterPeriod('month')} />
          </View>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.chipWrap}>
            <ChipButton label="All" selected={entryFilterKind === 'all'} onPress={() => setEntryFilterKind('all')} />
            <ChipButton label="Expense" selected={entryFilterKind === 'expense'} onPress={() => setEntryFilterKind('expense')} />
            <ChipButton label="Income" selected={entryFilterKind === 'income'} onPress={() => setEntryFilterKind('income')} />
          </View>
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.chipWrap}>
            <ChipButton label="All" selected={entryFilterCategoryId === 'all'} onPress={() => setEntryFilterCategoryId('all')} />
            {filterCategories.map(category => (
              <ChipButton key={category.id} label={category.name} selected={entryFilterCategoryId === category.id} onPress={() => setEntryFilterCategoryId(category.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Account</Text>
          <View style={styles.chipWrap}>
            <ChipButton label="All" selected={entryFilterAccountId === 'all'} onPress={() => setEntryFilterAccountId('all')} />
            {filterAccounts.map(account => (
              <ChipButton key={account.id} label={account.name} selected={entryFilterAccountId === account.id} onPress={() => setEntryFilterAccountId(account.id)} />
            ))}
          </View>
        </View>
        <SectionTitle title="Filtered totals" />
        {filteredTotals.length === 0 ? (
          <EmptyState text="No totals for these filters." />
        ) : (
          filteredTotals.map(total => (
            <View key={total.currency} style={styles.formCard}>
              <Text style={styles.cardTitle}>{total.currency}</Text>
              <Text style={styles.cardDetail}>{total.count} matching {total.count === 1 ? 'entry' : 'entries'}</Text>
              <Text style={styles.amount}>
                {formatMoney(total.expenseMinor, total.currency)} spent · {formatMoney(total.incomeMinor, total.currency)} income
              </Text>
              <Text style={styles.cardDetail}>
                {formatMoney(total.incomeMinor - total.expenseMinor, total.currency)} net
              </Text>
            </View>
          ))
        )}
        {editingId && (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerText}>Editing an entry</Text>
            <TextButton label="Cancel" onPress={resetForm} />
          </View>
        )}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} />
            <SegmentButton label="Income" selected={kind === 'income'} onPress={() => setKind('income')} />
          </View>
          <Text style={styles.formLabel}>Amount</Text>
          <TextInput
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.chipWrap}>
            {visibleCategories.map(categoryOption => (
              <ChipButton
                key={categoryOption.id}
                label={categoryOption.name}
                selected={categoryOption.id === activeCategoryId}
                onPress={() => setCategoryId(categoryOption.id)}
              />
            ))}
          </View>
          <Text style={styles.formLabel}>Account</Text>
          <View style={styles.chipWrap}>
            {data.accounts.filter(account => !account.isArchived).map(account => (
              <ChipButton
                key={account.id}
                label={account.name}
                selected={account.id === activeAccountId}
                onPress={() => setAccountId(account.id)}
              />
            ))}
          </View>
          <Text style={styles.formLabel}>Payee (optional)</Text>
          <View style={styles.chipWrap}>
            <ChipButton label="No payee" selected={payeeId === ''} onPress={() => setPayeeId('')} />
            {visiblePayees.map(payee => (
              <ChipButton key={payee.id} label={payee.name} selected={payee.id === payeeId} onPress={() => setPayeeId(payee.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Money note"
            placeholder="What was this for?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={note}
            onChangeText={setNote}
            multiline
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={editingId ? 'Update entry' : 'Save entry'} onPress={save} />
          {editingId && <TextButton label="Delete entry" danger onPress={removeEditing} />}
        </View>

        <SectionTitle title="Account balances" />
        <View style={styles.formCard}>
          {data.accounts.filter(account => !account.isArchived).map(account => (
            <View key={account.id} style={styles.manageRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{account.name}</Text>
                <Text style={styles.listMeta}>{account.currency}</Text>
              </View>
              <Text style={styles.amount}>
                {formatMoney(calculateAccountBalance(account, data.money, data.transfers), account.currency)}
              </Text>
            </View>
          ))}
        </View>

        <SectionTitle title="Add account or category" />
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>New account</Text>
          <TextInput
            accessibilityLabel="New account name"
            placeholder="Savings, cash..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={newAccount}
            onChangeText={setNewAccount}
          />
          <PrimaryButton label="Add account" onPress={saveAccount} />
          <Text style={styles.formLabel}>New payee</Text>
          <TextInput
            accessibilityLabel="New payee name"
            placeholder="A shop or person"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={newPayee}
            onChangeText={setNewPayee}
          />
          {payeeError && <Text style={styles.errorText}>{payeeError}</Text>}
          <PrimaryButton label="Add payee" onPress={savePayee} />
          <Text style={styles.formLabel}>New {kind} category</Text>
          <TextInput
            accessibilityLabel="New category name"
            placeholder="A category name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={newCategory}
            onChangeText={setNewCategory}
          />
          <PrimaryButton label="Add category" onPress={saveCategory} />
          <Text style={styles.formLabel}>Active accounts</Text>
          {data.accounts.filter(account => !account.isArchived).map(account => (
            <View key={account.id} style={styles.manageRow}>
              <Text style={styles.listTitle}>{account.name}</Text>
              <TextButton
                label="Archive"
                disabled={data.accounts.filter(item => !item.isArchived).length <= 1}
                onPress={() => archiveMoneyAccount(account.id)}
              />
            </View>
          ))}
          <Text style={styles.formLabel}>Active categories</Text>
          {data.categories.filter(category => !category.isArchived).map(category => (
            <View key={category.id} style={styles.manageRow}>
              <Text style={styles.listTitle}>{category.name}</Text>
              <TextButton label="Archive" onPress={() => archiveMoneyCategory(category.id)} />
            </View>
          ))}
          <Text style={styles.formLabel}>Active payees</Text>
          {data.payees.filter(payee => !payee.isArchived).map(payee => (
            <View key={payee.id} style={styles.manageRow}>
              <Text style={styles.listTitle}>{payee.name}</Text>
              <TextButton label="Archive" onPress={() => archiveMoneyPayee(payee.id)} />
            </View>
          ))}
        </View>

        <SectionTitle title={`Entries (${listEntries.length})`} />
        {listEntries.length === 0 ? (
          <EmptyState text="No money entries match these filters." />
        ) : (
          listEntries
            .slice(0, 20)
            .map(entry => (
            <Pressable
              key={entry.id}
              accessibilityLabel={`Edit ${entry.category} ${formatMoney(entry.amountMinor, entry.currency)}`}
              accessibilityRole="button"
              style={({pressed}) => [styles.listRow, pressed && styles.pressed]}
              onPress={() => startEdit(entry)}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{entry.category}</Text>
                <Text style={styles.listMeta}>
                  {[entry.payeeId ? payeeNames.get(entry.payeeId) : null, entry.note || formatDate(entry.occurredAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[styles.amount, entry.kind === 'income' ? styles.incomeText : styles.expenseText]}>
                {entry.kind === 'income' ? '+' : '-'}
                {formatMoney(entry.amountMinor, entry.currency)}
              </Text>
            </Pressable>
            ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface SplitLineDraft {
  categoryId: string;
  amount: string;
  note: string;
}

function MoneyRecurrenceScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {addMoneyRecurrence, deleteMoneyRecurrence} = useAppStore();
  const [kind, setKind] = useState<MoneyKind>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(data.accounts.find(account => !account.isArchived)?.id ?? '');
  const [cadence, setCadence] = useState<RecurrenceCadence>('month');
  const [interval, setInterval] = useState('1');
  const [nextOccurrenceLocalDate, setNextOccurrenceLocalDate] = useState(localDateKey(new Date()));
  const [missedOccurrencePolicy, setMissedOccurrencePolicy] = useState<MissedOccurrencePolicy>('all');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const categories = data.categories.filter(category => !category.isArchived && (category.kind === kind || category.kind === 'both'));
  const accounts = data.accounts.filter(account => !account.isArchived);
  const activeCategoryId = categoryId || categories[0]?.id;
  const activeAccountId = accountId || accounts[0]?.id;

  async function save() {
    const account = accounts.find(item => item.id === activeAccountId);
    const category = categories.find(item => item.id === activeCategoryId);
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
    const parsedInterval = Number.parseInt(interval, 10);
    const input: MoneyRecurrenceInput = {
      kind,
      amountMinor: Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : 0,
      currency: account?.currency ?? data.mainCurrency,
      accountId: activeAccountId ?? '',
      categoryId: category?.id ?? null,
      category: category?.name ?? 'Uncategorized',
      note: note.trim(),
      cadence,
      interval: Number.isFinite(parsedInterval) ? parsedInterval : 0,
      nextOccurrenceLocalDate,
      missedOccurrencePolicy,
    };
    try {
      await addMoneyRecurrence(input);
      setAmount('');
      setNote('');
      setError(null);
      setStatus('Recurring rule saved. Due entries were added from the start date.');
    } catch (saveError) {
      setStatus(null);
      setError(saveError instanceof Error ? saveError.message : 'Recurring rule could not be saved.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Recurring money</Text>
        <Text style={styles.pageIntro}>Rules use local calendar dates. Restarting the app does not create the same occurrence twice.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} />
            <SegmentButton label="Income" selected={kind === 'income'} onPress={() => setKind('income')} />
          </View>
          <Text style={styles.formLabel}>Amount</Text>
          <TextInput
            accessibilityLabel="Recurring amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.chipWrap}>
            {categories.map(category => (
              <ChipButton key={category.id} label={category.name} selected={category.id === activeCategoryId} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Account</Text>
          <View style={styles.chipWrap}>
            {accounts.map(account => (
              <ChipButton key={account.id} label={account.name} selected={account.id === activeAccountId} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Cadence</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Day" selected={cadence === 'day'} onPress={() => setCadence('day')} />
            <SegmentButton label="Week" selected={cadence === 'week'} onPress={() => setCadence('week')} />
            <SegmentButton label="Month" selected={cadence === 'month'} onPress={() => setCadence('month')} />
          </View>
          <Text style={styles.formLabel}>Every</Text>
          <TextInput
            accessibilityLabel="Recurring interval"
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={interval}
            onChangeText={setInterval}
          />
          <Text style={styles.formLabel}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            accessibilityLabel="Recurring start date"
            placeholder="2026-07-26"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={nextOccurrenceLocalDate}
            onChangeText={setNextOccurrenceLocalDate}
          />
          <Text style={styles.formLabel}>When missed dates are found</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="All" selected={missedOccurrencePolicy === 'all'} onPress={() => setMissedOccurrencePolicy('all')} />
            <SegmentButton label="One" selected={missedOccurrencePolicy === 'one'} onPress={() => setMissedOccurrencePolicy('one')} />
            <SegmentButton label="Skip" selected={missedOccurrencePolicy === 'skip'} onPress={() => setMissedOccurrencePolicy('skip')} />
          </View>
          <Text style={styles.cardDetail}>All creates every missed date. One creates the first missed date. Skip creates none. The rule then advances past all missed dates.</Text>
          <Text style={styles.formLabel}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Recurring note"
            placeholder="What is this recurring item for?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={note}
            onChangeText={setNote}
            multiline
          />
          {status && <Text style={styles.successText}>{status}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Save recurring rule" onPress={save} />
        </View>
        <SectionTitle title="Current recurring rules" />
        {data.recurrences.length === 0 ? (
          <EmptyState text="No recurring money rules yet." />
        ) : (
          data.recurrences.map(rule => (
            <View key={rule.id} style={styles.formCard}>
              <Text style={styles.cardTitle}>{rule.category}</Text>
              <Text style={styles.cardDetail}>{rule.kind} · {formatMoney(rule.amountMinor, rule.currency)} every {rule.interval} {rule.cadence}{rule.interval === 1 ? '' : 's'}</Text>
              <Text style={styles.cardDetail}>Missed dates: {rule.missedOccurrencePolicy}</Text>
              <Text style={styles.cardDetail}>Next: {rule.nextOccurrenceLocalDate}</Text>
              <TextButton label="Delete rule" danger onPress={() => deleteMoneyRecurrence(rule.id)} />
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyBudgetScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {addMoneyBudget, deleteMoneyBudget} = useAppStore();
  const categories = data.categories.filter(category => !category.isArchived && (category.kind === 'expense' || category.kind === 'both'));
  const currencies = [...new Set(data.accounts.filter(account => !account.isArchived).map(account => account.currency))];
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [currency, setCurrency] = useState(currencies[0] ?? data.mainCurrency);
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const [rollover, setRollover] = useState<BudgetRollover>('none');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    const category = categories.find(item => item.id === categoryId);
    const input: MoneyBudgetInput = {
      categoryId,
      category: category?.name ?? '',
      amountMinor: Number.isFinite(parsed) ? Math.round(parsed * 100) : 0,
      currency,
      period,
      rollover,
    };
    const validationError = validateMoneyBudget(input, data.categories);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await addMoneyBudget(input);
      setAmount('');
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Budget could not be saved.');
    }
  }

  if (categories.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Budgets</Text>
        <EmptyState text="Add an active expense category before creating a budget." />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Budgets</Text>
        <Text style={styles.pageIntro}>Budgets count expense entries and split lines in the selected currency and local period.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.chipWrap}>
            {categories.map(category => (
              <ChipButton
                key={category.id}
                label={category.name}
                selected={category.id === categoryId}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>
          <Text style={styles.formLabel}>Currency</Text>
          <View style={styles.chipWrap}>
            {currencies.map(option => (
              <ChipButton key={option} label={option} selected={option === currency} onPress={() => setCurrency(option)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Period</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Day" selected={period === 'day'} onPress={() => setPeriod('day')} />
            <SegmentButton label="Week" selected={period === 'week'} onPress={() => setPeriod('week')} />
            <SegmentButton label="Month" selected={period === 'month'} onPress={() => setPeriod('month')} />
          </View>
          <Text style={styles.formLabel}>Rollover</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="None" selected={rollover === 'none'} onPress={() => setRollover('none')} />
            <SegmentButton label="Carry forward" selected={rollover === 'carry-forward'} onPress={() => setRollover('carry-forward')} />
          </View>
          <Text style={styles.formLabel}>Limit ({currency})</Text>
          <TextInput
            accessibilityLabel="Budget limit"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Save budget" onPress={save} />
        </View>
        <SectionTitle title="Current budgets" />
        {data.budgets.length === 0 ? (
          <EmptyState text="No budgets yet." />
        ) : (
          data.budgets.filter(budget => !budget.isArchived).map(budget => {
            const projection = buildBudgetProjection(budget, data.money, data.splits, new Date(), data.weekStartsOn);
            return (
              <View key={budget.id} style={styles.formCard}>
                <Text style={styles.cardTitle}>{budget.category}</Text>
                <Text style={styles.cardDetail}>{budget.period} · {budget.currency} {formatMoney(budget.amountMinor, budget.currency)} limit</Text>
                {projection.rolloverMinor > 0 && (
                  <Text style={styles.cardDetail}>{formatMoney(projection.rolloverMinor, budget.currency)} carried forward from the previous period</Text>
                )}
                <Text style={styles.cardValue}>{formatMoney(projection.usedMinor, budget.currency)} used</Text>
                <Text style={styles.cardDetail}>
                  {formatMoney(projection.remainingMinor, budget.currency)} remaining · {projection.percentUsed}% used
                </Text>
                <Text style={projection.status === 'over' ? styles.errorText : projection.status === 'near-limit' ? styles.warningText : styles.successText}>
                  {budgetStatusLabel(projection.status)}
                </Text>
                <TextButton label="Delete budget" danger onPress={() => deleteMoneyBudget(budget.id)} />
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function budgetStatusLabel(status: 'empty' | 'on-track' | 'near-limit' | 'over'): string {
  if (status === 'empty') {
    return 'No spending yet';
  }
  if (status === 'near-limit') {
    return 'Near the budget limit';
  }
  if (status === 'over') {
    return 'Over budget';
  }
  return 'On track';
}

function MoneySplitScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {addSplitMoney, deleteMoney} = useAppStore();
  const activeAccounts = data.accounts.filter(account => !account.isArchived);
  const [kind, setKind] = useState<MoneyKind>('expense');
  const visibleCategories = data.categories.filter(
    category => !category.isArchived && (category.kind === kind || category.kind === 'both'),
  );
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<SplitLineDraft[]>(() => [
    {categoryId: visibleCategories[0]?.id ?? '', amount: '', note: ''},
    {categoryId: visibleCategories[1]?.id ?? visibleCategories[0]?.id ?? '', amount: '', note: ''},
  ]);
  const [error, setError] = useState<string | null>(null);
  const currency = activeAccounts.find(account => account.id === accountId)?.currency ?? data.mainCurrency;

  function changeKind(nextKind: MoneyKind) {
    setKind(nextKind);
    const nextCategories = data.categories.filter(
      category => !category.isArchived && (category.kind === nextKind || category.kind === 'both'),
    );
    setLines(current => current.map((line, index) => ({
      ...line,
      categoryId: nextCategories.some(category => category.id === line.categoryId)
        ? line.categoryId
        : nextCategories[index % Math.max(nextCategories.length, 1)]?.id ?? '',
    })));
  }

  async function save() {
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
    const input: MoneySplitInput = {
      kind,
      amountMinor: Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : 0,
      currency,
      accountId,
      category: 'Split',
      note: note.trim(),
      lines: lines.map(line => ({
        categoryId: line.categoryId,
        category: visibleCategories.find(category => category.id === line.categoryId)?.name ?? '',
        amountMinor: Number.isFinite(Number.parseFloat(line.amount.replace(',', '.')))
          ? Math.round(Number.parseFloat(line.amount.replace(',', '.')) * 100)
          : 0,
        note: line.note.trim(),
      })),
    };
    const validationError = validateMoneySplit(input, data.accounts, data.categories);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await addSplitMoney(input);
      setAmount('');
      setNote('');
      setLines([
        {categoryId: visibleCategories[0]?.id ?? '', amount: '', note: ''},
        {categoryId: visibleCategories[1]?.id ?? visibleCategories[0]?.id ?? '', amount: '', note: ''},
      ]);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Split entry could not be saved.');
    }
  }

  function updateLine(index: number, update: Partial<SplitLineDraft>) {
    setLines(current => current.map((line, lineIndex) => (lineIndex === index ? {...line, ...update} : line)));
  }

  if (activeAccounts.length === 0 || visibleCategories.length < 2) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Split entry</Text>
        <EmptyState text="Add an active account and at least two matching categories before creating a split entry." />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Split entry</Text>
        <Text style={styles.pageIntro}>Line amounts must add up exactly to the parent amount. Each line appears under its own report category.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Expense" selected={kind === 'expense'} onPress={() => changeKind('expense')} />
            <SegmentButton label="Income" selected={kind === 'income'} onPress={() => changeKind('income')} />
          </View>
          <Text style={styles.formLabel}>Account</Text>
          <View style={styles.chipWrap}>
            {activeAccounts.map(account => (
              <ChipButton
                key={account.id}
                label={`${account.name} (${account.currency})`}
                selected={account.id === accountId}
                onPress={() => setAccountId(account.id)}
              />
            ))}
          </View>
          <Text style={styles.formLabel}>Parent amount ({currency})</Text>
          <TextInput
            accessibilityLabel="Split parent amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.formLabel}>Parent note (optional)</Text>
          <TextInput
            accessibilityLabel="Split parent note"
            placeholder="What was this for?"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={note}
            onChangeText={setNote}
          />
          {lines.map((line, index) => (
            <View key={index} style={styles.splitLineCard}>
              <Text style={styles.formLabel}>Line {index + 1} category</Text>
              <View style={styles.chipWrap}>
                {visibleCategories.map(category => (
                  <ChipButton
                    key={category.id}
                    label={category.name}
                    selected={category.id === line.categoryId}
                    onPress={() => updateLine(index, {categoryId: category.id})}
                  />
                ))}
              </View>
              <TextInput
                accessibilityLabel={`Split line ${index + 1} amount`}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={line.amount}
                onChangeText={value => updateLine(index, {amount: value})}
              />
              <TextInput
                accessibilityLabel={`Split line ${index + 1} note`}
                placeholder="Line note (optional)"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={line.note}
                onChangeText={value => updateLine(index, {note: value})}
              />
              {lines.length > 2 && <TextButton label="Remove line" danger onPress={() => setLines(current => current.filter((_, lineIndex) => lineIndex !== index))} />}
            </View>
          ))}
          <TextButton
            label="Add another line"
            onPress={() => setLines(current => [...current, {categoryId: visibleCategories[0]?.id ?? '', amount: '', note: ''}])}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Save split entry" onPress={save} />
        </View>
        <SectionTitle title="Recent split entries" />
        {data.splits.length === 0 ? (
          <EmptyState text="No split entries yet." />
        ) : (
          data.splits.slice(0, 20).map(split => {
            const parentEntry = data.money.find(entry => entry.id === split.parentEntryId);
            return parentEntry ? (
              <View key={split.id} style={styles.listRow}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{split.lines.map(line => line.category).join(' + ')}</Text>
                  <Text style={styles.listMeta}>{parentEntry.note || formatDate(parentEntry.occurredAt)}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Text style={styles.amount}>{formatMoney(parentEntry.amountMinor, parentEntry.currency)}</Text>
                  <TextButton label="Delete" danger onPress={() => deleteMoney(parentEntry.id)} />
                </View>
              </View>
            ) : null;
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyTransferScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {addMoneyTransfer, deleteMoneyTransfer} = useAppStore();
  const activeAccounts = data.accounts.filter(account => !account.isArchived);
  const [fromAccountId, setFromAccountId] = useState(activeAccounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(activeAccounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currency = activeAccounts.find(account => account.id === fromAccountId)?.currency ?? data.mainCurrency;

  async function save() {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    const input = {
      fromAccountId,
      toAccountId,
      amountMinor: Number.isFinite(parsed) ? Math.round(parsed * 100) : 0,
      currency,
      note: note.trim(),
    };
    const validationError = validateMoneyTransfer(input, data.accounts);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await addMoneyTransfer(input);
      setAmount('');
      setNote('');
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Transfer could not be saved.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Money</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Transfer money</Text>
        <Text style={styles.pageIntro}>Move money between same-currency accounts. Transfers do not change income or spending reports.</Text>
        {activeAccounts.length < 2 ? (
          <EmptyState text="Add a second active account before creating a transfer." />
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>From account</Text>
            <View style={styles.chipWrap}>
              {activeAccounts.map(account => (
                <ChipButton
                  key={account.id}
                  label={`${account.name} (${account.currency})`}
                  selected={account.id === fromAccountId}
                  onPress={() => setFromAccountId(account.id)}
                />
              ))}
            </View>
            <Text style={styles.formLabel}>To account</Text>
            <View style={styles.chipWrap}>
              {activeAccounts.map(account => (
                <ChipButton
                  key={account.id}
                  label={`${account.name} (${account.currency})`}
                  selected={account.id === toAccountId}
                  onPress={() => setToAccountId(account.id)}
                />
              ))}
            </View>
            <Text style={styles.formLabel}>Amount ({currency})</Text>
            <TextInput
              accessibilityLabel="Transfer amount"
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.formLabel}>Note (optional)</Text>
            <TextInput
              accessibilityLabel="Transfer note"
              placeholder="Why move it?"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={note}
              onChangeText={setNote}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <PrimaryButton label="Save transfer" onPress={save} />
          </View>
        )}
        <SectionTitle title="Account balances" />
        <View style={styles.formCard}>
          {activeAccounts.map(account => (
            <View key={account.id} style={styles.manageRow}>
              <Text style={styles.listTitle}>{account.name}</Text>
              <Text style={styles.amount}>{formatMoney(calculateAccountBalance(account, data.money, data.transfers), account.currency)}</Text>
            </View>
          ))}
        </View>
        <SectionTitle title="Transfers" />
        {data.transfers.length === 0 ? (
          <EmptyState text="No transfers yet." />
        ) : (
          data.transfers.slice(0, 20).map(transfer => (
            <TransferRow
              key={transfer.id}
              transfer={transfer}
              accounts={data.accounts}
              onDelete={() => deleteMoneyTransfer(transfer.id)}
            />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TransferRow({
  transfer,
  accounts,
  onDelete,
}: {
  transfer: MoneyTransfer;
  accounts: AppData['accounts'];
  onDelete: () => void;
}) {
  const fromName = accounts.find(account => account.id === transfer.fromAccountId)?.name ?? 'Unknown account';
  const toName = accounts.find(account => account.id === transfer.toAccountId)?.name ?? 'Unknown account';
  return (
    <View style={styles.listRow}>
      <View style={styles.listBody}>
        <Text style={styles.listTitle}>{fromName} to {toName}</Text>
        <Text style={styles.listMeta}>{transfer.note || formatDate(transfer.occurredAt)}</Text>
      </View>
      <View style={styles.rowActions}>
        <Text style={styles.amount}>{formatMoney(transfer.amountMinor, transfer.currency)}</Text>
        <TextButton label="Delete" danger onPress={onDelete} />
      </View>
    </View>
  );
}

function MoneyReportScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const [period, setPeriod] = useState<Period>('month');
  const [kind, setKind] = useState<MoneyReportFilter['kind']>(emptyMoneyReportFilter.kind);
  const [categoryId, setCategoryId] = useState<string | 'all'>(emptyMoneyReportFilter.categoryId);
  const [accountId, setAccountId] = useState<string | 'all'>(emptyMoneyReportFilter.accountId);
  const range = getPeriodRange(new Date(), period, data.weekStartsOn);
  const filter: MoneyReportFilter = {kind, categoryId, accountId};
  const report = buildMoneyReport(data.money, range, data.splits, filter);
  const filterCategories = data.categories.filter(category => !category.isArchived || category.id === categoryId);
  const filterAccounts = data.accounts.filter(account => !account.isArchived || account.id === accountId);
  const kindLabel = kind === 'all' ? 'All types' : kind === 'expense' ? 'Expenses' : 'Income';
  const categoryLabel = categoryId === 'all' ? 'All categories' : data.categories.find(category => category.id === categoryId)?.name ?? 'Selected category';
  const accountLabel = accountId === 'all' ? 'All accounts' : data.accounts.find(account => account.id === accountId)?.name ?? 'Selected account';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Pressable accessibilityLabel="Back to Money" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>â€¹ Money</Text>
      </Pressable>
      <Text style={styles.pageTitle}>Money report</Text>
      <Text style={styles.pageIntro}>Totals stay separate by currency and use the selected local period.</Text>
      <View style={styles.segmentRow}>
        <SegmentButton label="Day" selected={period === 'day'} onPress={() => setPeriod('day')} />
        <SegmentButton label="Week" selected={period === 'week'} onPress={() => setPeriod('week')} />
        <SegmentButton label="Month" selected={period === 'month'} onPress={() => setPeriod('month')} />
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Report scope</Text>
        <Text style={styles.cardDetail}>Range: {formatPeriodRange(range)}</Text>
        <Text style={styles.cardDetail}>Filters: {kindLabel}, {categoryLabel}, {accountLabel}</Text>
        <Text style={styles.cardDetail}>Excluded: transfers and entries outside the range; currencies stay in separate cards.</Text>
      </View>
      <Text style={styles.formLabel}>Type</Text>
      <View style={styles.chipWrap}>
        <ChipButton label="All" selected={kind === 'all'} onPress={() => setKind('all')} />
        <ChipButton label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} />
        <ChipButton label="Income" selected={kind === 'income'} onPress={() => setKind('income')} />
      </View>
      <Text style={styles.formLabel}>Category</Text>
      <View style={styles.chipWrap}>
        <ChipButton label="All" selected={categoryId === 'all'} onPress={() => setCategoryId('all')} />
        {filterCategories.map(category => (
          <ChipButton key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
        ))}
      </View>
      <Text style={styles.formLabel}>Account</Text>
      <View style={styles.chipWrap}>
        <ChipButton label="All" selected={accountId === 'all'} onPress={() => setAccountId('all')} />
        {filterAccounts.map(account => (
          <ChipButton key={account.id} label={account.name} selected={accountId === account.id} onPress={() => setAccountId(account.id)} />
        ))}
      </View>
      {report.currencies.length === 0 ? (
        <EmptyState text="No money entries match this report scope." />
      ) : (
        report.currencies.map(currencyReport => (
          <View key={currencyReport.currency} style={styles.formCard}>
            <Text style={styles.cardTitle}>{currencyReport.currency}</Text>
            <Text style={styles.cardValue}>{formatMoney(currencyReport.expenseMinor, currencyReport.currency)} spent</Text>
            <Text style={styles.cardDetail}>
              {formatMoney(currencyReport.incomeMinor, currencyReport.currency)} income ·{' '}
              {formatMoney(currencyReport.incomeMinor - currencyReport.expenseMinor, currencyReport.currency)} net
            </Text>
            <SectionTitle title="By category" />
            {currencyReport.categories.map(category => (
              <View key={category.name} style={styles.manageRow}>
                <Text style={styles.listTitle}>{category.name}</Text>
                <Text style={styles.listMeta}>
                  {formatMoney(category.expenseMinor, currencyReport.currency)} spent ·{' '}
                  {formatMoney(category.incomeMinor, currencyReport.currency)} income
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function AppTimeScreen({onBack}: {onBack: () => void}) {
  const {data, setUsagePermission, replaceUsageSnapshots, toggleUsageExclusion, addTimeGoal} = useAppStore();
  const [permission, setPermission] = useState(data?.usageRead.permission ?? 'unknown');
  const [isChecking, setIsChecking] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [usagePeriod, setUsagePeriod] = useState<Period>('day');
  const [goalName, setGoalName] = useState('Weekly attention');
  const [goalPeriod, setGoalPeriod] = useState<'day' | 'week'>('week');
  const [goalMinutes, setGoalMinutes] = useState('300');

  useEffect(() => {
    void checkPermission();
  }, []);

  if (!data) {
    return null;
  }
  const currentData = data;

  async function checkPermission() {
    if (!usageAccess.isSupported()) {
      setPermission('unsupported');
      await setUsagePermission('unsupported');
      setIsChecking(false);
      return;
    }
    try {
      const granted = await usageAccess.hasPermission();
      const nextPermission = granted ? 'granted' : 'denied';
      setPermission(nextPermission);
      await setUsagePermission(nextPermission);
    } catch {
      setPermission('denied');
      await setUsagePermission('denied', 'USAGE_ACCESS_CHECK_FAILED');
    } finally {
      setIsChecking(false);
    }
  }

  async function refreshUsage() {
    setIsRefreshing(true);
    const range = getPeriodRange(new Date(), usagePeriod, currentData.weekStartsOn);
    const dayRanges = getLocalDayRanges(range);
    setMessage(`Reading ${periodLabel(usagePeriod).toLowerCase()} app time...`);
    try {
      const sourceReadAt = new Date().toISOString();
      const dailyRecords: Array<{records: UsageRecord[]; rangeStartMillis: number}> = [];
      for (const dayRange of dayRanges) {
        const rawRecords = await usageAccess.query(dayRange.start.getTime(), dayRange.end.getTime());
        dailyRecords.push({records: rawRecords, rangeStartMillis: dayRange.start.getTime()});
      }
      const snapshots = aggregateUsagePeriod(dailyRecords, sourceReadAt);
      await replaceUsageSnapshots({
        snapshots,
        localDates: getLocalDateKeys(range),
        rangeStartMillis: range.start.getTime(),
        rangeEndMillis: range.end.getTime(),
      });
      setMessage(`${snapshots.length} app records read for ${periodLabel(usagePeriod).toLowerCase()}.`);
    } catch {
      setMessage('Android could not provide usage data. Check permission and try again.');
    } finally {
      setIsRefreshing(false);
    }
  }

  const range = getPeriodRange(new Date(), usagePeriod, currentData.weekStartsOn);
  const periodDates = getLocalDateKeys(range);
  const selectedPeriodLabel = periodLabel(usagePeriod);
  const allPeriodSnapshots = data.usageSnapshots
    .filter(snapshot => periodDates.has(snapshot.localDate))
    .sort((left, right) => right.durationSeconds - left.durationSeconds);
  const totalSeconds = sumUsage(data.usageSnapshots, periodDates);
  const todaySeconds = sumUsage(data.usageSnapshots, new Set([localDateKey(new Date())]));
  const weekRange = getPeriodRange(new Date(), 'week', data.weekStartsOn);
  const weekDates = getLocalDateKeys(weekRange);
  const weeklySeconds = sumUsage(data.usageSnapshots, weekDates);
  const activeGoal = data.timeGoals.find(goal => !goal.isArchived && goal.period === goalPeriod);
  const goalSeconds = goalPeriod === 'day' ? todaySeconds : weeklySeconds;

  async function saveGoal() {
    const minutes = Number.parseInt(goalMinutes, 10);
    const name = goalName.trim();
    if (!name || !Number.isInteger(minutes) || minutes <= 0) {
      setMessage('Enter a goal name and a positive number of minutes.');
      return;
    }
    await addTimeGoal({name, period: goalPeriod, targetSeconds: minutes * 60});
    setMessage(`${name} goal saved.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Pressable accessibilityLabel="Back to Home" accessibilityRole="button" style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>‹ Home</Text>
      </Pressable>
      <Text style={styles.pageTitle}>App time</Text>
      <Text style={styles.pageIntro}>Read-only totals from Android Usage Access. Nothing leaves this device.</Text>
      <FocusSessionPanel data={data} />

      {!usageAccess.isSupported() ? (
        <EmptyState text="App-time data is not available on this platform." />
      ) : isChecking ? (
        <EmptyState text="Checking Android Usage Access..." />
      ) : permission !== 'granted' ? (
        <View style={styles.formCard}>
          <Text style={styles.listTitle}>Usage Access is off</Text>
          <Text style={styles.cardDetail}>
            Android has not shared app-time data with Yuzuha. Open system settings, allow access, then return here.
          </Text>
          <PrimaryButton label="Open Android settings" onPress={() => usageAccess.openSettings()} />
          <PrimaryButton label="Check permission again" onPress={() => checkPermission()} />
        </View>
      ) : (
        <>
          <SectionTitle title="Report period" />
          <View style={styles.formCard}>
            <Text style={styles.cardDetail}>Selected range: {formatPeriodRange(range)}. Refresh reads each local day once and commits the result together.</Text>
            <View style={styles.segmentRow}>
              <SegmentButton label="Day" selected={usagePeriod === 'day'} onPress={() => setUsagePeriod('day')} />
              <SegmentButton label="Week" selected={usagePeriod === 'week'} onPress={() => setUsagePeriod('week')} />
              <SegmentButton label="Month" selected={usagePeriod === 'month'} onPress={() => setUsagePeriod('month')} />
            </View>
          </View>
          <SummaryCard
            title={selectedPeriodLabel}
            value={formatDuration(totalSeconds)}
            detail={`${formatPeriodRange(range)}. ${data.usageRead.lastReadAt ? `Last read ${formatDate(data.usageRead.lastReadAt)}` : 'No read yet'}`}
            action={isRefreshing ? 'Reading...' : 'Refresh selected period'}
            disabled={isRefreshing}
            onPress={refreshUsage}
          />
          {message && <Text style={styles.successText}>{message}</Text>}
          <SectionTitle title={appTimeTopAppsLabel(usagePeriod)} />
          {allPeriodSnapshots.length === 0 ? (
            <EmptyState text={`No app-time data has been read for ${selectedPeriodLabel.toLowerCase()}.`} />
          ) : (
            allPeriodSnapshots.slice(0, 10).map(snapshot => (
              <View key={snapshot.id} style={styles.listRow}>
                <View style={styles.listBody}>
                  <Text style={[styles.listTitle, !snapshot.included && styles.completedText]}>{snapshot.displayName}</Text>
                  <Text style={styles.listMeta}>{snapshot.packageName}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Text style={styles.amount}>{snapshot.included ? formatDuration(snapshot.durationSeconds) : 'Excluded'}</Text>
                  <TextButton
                    label={snapshot.included ? 'Exclude' : 'Include'}
                    onPress={() => toggleUsageExclusion(snapshot.packageName)}
                  />
                </View>
              </View>
            ))
          )}
          <SectionTitle title="Weekly goal" />
          <View style={styles.formCard}>
            <Text style={styles.cardDetail}>
              {activeGoal ? `${formatDuration(goalSeconds)} of ${formatDuration(activeGoal.targetSeconds)}` : `No ${goalPeriod} goal yet.`}
            </Text>
            <TextInput
              accessibilityLabel="Goal name"
              placeholder="Weekly attention"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={goalName}
              onChangeText={setGoalName}
            />
            <View style={styles.segmentRow}>
              <SegmentButton label="Daily" selected={goalPeriod === 'day'} onPress={() => setGoalPeriod('day')} />
              <SegmentButton label="Weekly" selected={goalPeriod === 'week'} onPress={() => setGoalPeriod('week')} />
            </View>
            <TextInput
              accessibilityLabel="Goal minutes"
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={goalMinutes}
              onChangeText={setGoalMinutes}
            />
            <PrimaryButton label="Save time goal" onPress={saveGoal} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function FocusSessionPanel({data}: {data: AppData}) {
  const {startFocusSession, finishFocusSession, deleteFocusSession, addAppGroup, setAppGroupArchived, deleteAppGroup} = useAppStore();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [appGroupId, setAppGroupId] = useState<string | null>(null);
  const [appGroupName, setAppGroupName] = useState('');
  const [appGroupPackages, setAppGroupPackages] = useState('');
  const [clockMillis, setClockMillis] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeSession = data.focusSessions.find(session => session.status === 'active') ?? null;

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    const updateClock = () => setClockMillis(Date.now());
    updateClock();
    const interval = globalThis.setInterval(updateClock, 1000);
    return () => globalThis.clearInterval(interval);
  }, [activeSession?.id]);

  async function start() {
    setMessage(null);
    setError(null);
    try {
      await startFocusSession({taskId, projectId, noteId, appGroupId});
      setMessage('Focus session started.');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'The focus session could not start.');
    }
  }

  async function finish(action: 'completed' | 'manual') {
    if (!activeSession) {
      return;
    }
    setMessage(null);
    setError(null);
    try {
      await finishFocusSession(activeSession.id, action);
      setMessage(action === 'completed' ? 'Focus session completed.' : 'Focus session stopped.');
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : 'The focus session could not finish.');
    }
  }

  async function addGroup() {
    const draft = {name: appGroupName, packageNames: appGroupPackages.split(',')};
    const validationError = validateAppGroupDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setMessage(null);
    setError(null);
    try {
      const createdId = await addAppGroup(draft);
      setAppGroupId(createdId);
      setAppGroupName('');
      setAppGroupPackages('');
      setMessage('App group saved.');
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : 'The app group could not be saved.');
    }
  }

  function confirmDeleteGroup(groupId: string, name: string) {
    Alert.alert('Delete app group?', `Delete "${name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void deleteAppGroup(groupId).catch(deleteError => setError(deleteError instanceof Error ? deleteError.message : 'The app group could not be deleted.'))},
    ]);
  }

  function sessionDetail(session: AppData['focusSessions'][number]): string {
    const task = session.taskId ? data.tasks.find(item => item.id === session.taskId)?.title ?? 'Deleted task' : null;
    const project = session.projectId ? data.projects.find(item => item.id === session.projectId)?.name ?? 'Deleted project' : null;
    const note = session.noteId ? data.notes.find(item => item.id === session.noteId)?.title ?? 'Deleted note' : null;
    const group = session.appGroupId ? data.appGroups.find(item => item.id === session.appGroupId)?.name ?? 'Deleted app group' : null;
    return [task, project, note, group].filter(Boolean).join(' · ') || 'No linked records';
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>Focus sessions</Text>
      <Text style={styles.cardDetail}>Track one manual focus block locally. It does not block apps.</Text>
      {activeSession ? (
        <>
          <Text style={styles.cardValue}>{formatDuration(focusSessionDurationSeconds(activeSession, new Date(clockMillis).toISOString()))}</Text>
          <Text style={styles.cardDetail}>{sessionDetail(activeSession)}</Text>
          <View style={styles.rowActions}>
            <PrimaryButton label="Complete focus" onPress={() => void finish('completed')} />
            <TextButton label="Stop focus" onPress={() => void finish('manual')} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.formLabel}>Task (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No task" selected={taskId === null} onPress={() => setTaskId(null)} />
            {data.tasks.slice(0, 12).map(task => <SegmentButton key={task.id} label={task.title} selected={taskId === task.id} onPress={() => setTaskId(task.id)} />)}
          </View>
          <Text style={styles.formLabel}>Project (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No project" selected={projectId === null} onPress={() => setProjectId(null)} />
            {data.projects.filter(project => !project.isArchived).map(project => <SegmentButton key={project.id} label={project.name} selected={projectId === project.id} onPress={() => setProjectId(project.id)} />)}
          </View>
          <Text style={styles.formLabel}>Note (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No note" selected={noteId === null} onPress={() => setNoteId(null)} />
            {data.notes.filter(note => !note.isArchived).slice(0, 12).map(note => <SegmentButton key={note.id} label={note.title} selected={noteId === note.id} onPress={() => setNoteId(note.id)} />)}
          </View>
          <Text style={styles.formLabel}>App group (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No app group" selected={appGroupId === null} onPress={() => setAppGroupId(null)} />
            {data.appGroups.filter(group => !group.isArchived).map(group => <SegmentButton key={group.id} label={group.name} selected={appGroupId === group.id} onPress={() => setAppGroupId(group.id)} />)}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {message && <Text style={styles.successText}>{message}</Text>}
          <PrimaryButton label="Start focus session" onPress={() => void start()} />
        </>
      )}
      {!activeSession && data.focusSessions.length === 0 && <Text style={styles.emptyState}>No focus sessions yet.</Text>}
      {data.focusSessions.length > 0 && (
        <>
          <SectionTitle title="Recent sessions" />
          {data.focusSessions.slice(0, 10).map(session => (
            <View key={session.id} style={styles.listRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{session.status === 'completed' ? 'Completed focus' : session.status === 'stopped' ? 'Stopped focus' : 'Active focus'}</Text>
                <Text style={styles.listMeta}>{formatDate(session.startedAt)} · {formatDuration(focusSessionDurationSeconds(session, new Date(clockMillis).toISOString()))}</Text>
                <Text style={styles.listMeta}>{sessionDetail(session)}</Text>
              </View>
              <TextButton label="Delete" danger onPress={() => void deleteFocusSession(session.id)} />
            </View>
          ))}
        </>
      )}
      <SectionTitle title="App groups" />
      <TextInput accessibilityLabel="App group name" placeholder="App group name" placeholderTextColor={colors.muted} style={styles.input} value={appGroupName} onChangeText={setAppGroupName} />
      <TextInput accessibilityLabel="App group packages" placeholder="com.editor, com.browser" placeholderTextColor={colors.muted} style={styles.input} value={appGroupPackages} onChangeText={setAppGroupPackages} />
      <PrimaryButton label="Add app group" onPress={() => void addGroup()} />
      {data.appGroups.length === 0 ? <Text style={styles.emptyState}>No app groups yet.</Text> : data.appGroups.map(group => (
        <View key={group.id} style={styles.listRow}>
          <View style={styles.listBody}>
            <Text style={styles.listTitle}>{group.name}</Text>
            <Text style={styles.listMeta}>{group.packageNames.join(', ')} · {group.isArchived ? 'Archived' : 'Active'}</Text>
          </View>
          <View style={styles.rowActions}>
            <TextButton label={group.isArchived ? 'Restore' : 'Archive'} onPress={() => void setAppGroupArchived(group.id, !group.isArchived)} />
            <TextButton label="Delete" danger onPress={() => confirmDeleteGroup(group.id, group.name)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function NotesScreen({focusNoteId, onFocusHandled}: {focusNoteId: string | null; onFocusHandled: () => void}) {
  const {data, addNote, updateNote, addNoteLink, deleteNoteLink, toggleNotePinned, setNoteArchived, deleteNote, addSavedSearch, deleteSavedSearch, createTaskFromNote, addAttachment, deleteAttachment} = useAppStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bodySelection, setBodySelection] = useState<NoteTextSelection>({start: 0, end: 0});
  const [tags, setTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [busySavedSearchId, setBusySavedSearchId] = useState<string | null>(null);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [linkTargetType, setLinkTargetType] = useState<NoteLinkTargetType>('task');
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [linkTargetSearch, setLinkTargetSearch] = useState('');

  useEffect(() => {
    if (!focusNoteId || !data) {
      return;
    }
    const note = data.notes.find(item => item.id === focusNoteId);
    if (!note) {
      onFocusHandled();
      return;
    }
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setBodySelection({start: note.body.length, end: note.body.length});
    setTags(note.tags.join(', '));
    setShowArchived(note.isArchived);
    setError(null);
    onFocusHandled();
  }, [data, focusNoteId, onFocusHandled]);

  if (!data) {
    return null;
  }

  const attachmentNamesByNoteId = new Map<string, string[]>();
  for (const attachment of data.attachments) {
    const names = attachmentNamesByNoteId.get(attachment.noteId) ?? [];
    names.push(attachment.name);
    attachmentNamesByNoteId.set(attachment.noteId, names);
  }
  const visibleNotes = filterNotes(data.notes, searchQuery, showArchived, attachmentNamesByNoteId);

  async function save() {
    const draft = {title: title.trim(), body: body.trim(), tags: normalizeNoteTags(tags)};
    const validationError = validateNoteDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, draft);
      } else {
        await addNote(draft);
      }
      cancelEditing();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note could not be saved.');
    }
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setBodySelection({start: 0, end: 0});
    setTags('');
  }

  function startEditing(note: Note) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setBodySelection({start: note.body.length, end: note.body.length});
    setTags(note.tags.join(', '));
    setError(null);
  }

  function formatBody(action: NoteMarkupAction) {
    const formatted = applyNoteMarkup(body, bodySelection, action);
    setBody(formatted.text);
    setBodySelection(formatted.selection);
  }

  function startLinking(note: Note) {
    if (!data) {
      return;
    }
    const nextType: NoteLinkTargetType = 'task';
    setLinkingNoteId(note.id);
    setLinkTargetType(nextType);
    setLinkTargetSearch('');
    const linkedTargetIds = new Set(data.noteLinks.filter(link => link.noteId === note.id && link.targetType === nextType).map(link => link.targetId));
    setLinkTargetId(noteLinkOptions(nextType, data, '').find(option => !linkedTargetIds.has(option.id))?.id ?? null);
    setError(null);
  }

  function changeLinkTargetType(nextType: NoteLinkTargetType) {
    if (!data) {
      return;
    }
    setLinkTargetType(nextType);
    setLinkTargetSearch('');
    setLinkTargetId(noteLinkOptions(nextType, data, '')[0]?.id ?? null);
  }

  async function saveNoteLink(note: Note) {
    if (!linkTargetId) {
      setError('Choose a record to link.');
      return;
    }
    setError(null);
    setBusyNoteId(note.id);
    try {
      await addNoteLink({noteId: note.id, targetType: linkTargetType, targetId: linkTargetId});
      setLinkingNoteId(null);
      setLinkTargetId(null);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'The note link could not be saved.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function removeNoteLink(link: NoteLink) {
    setError(null);
    setBusyNoteId(link.noteId);
    try {
      await deleteNoteLink(link.id);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'The note link could not be removed.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function togglePinned(note: Note) {
    setError(null);
    setBusyNoteId(note.id);
    try {
      await toggleNotePinned(note.id);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note could not be pinned.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function changeArchived(note: Note) {
    setError(null);
    setBusyNoteId(note.id);
    try {
      await setNoteArchived(note.id, !note.isArchived);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note archive state could not be changed.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function removeNote(note: Note) {
    setError(null);
    setBusyNoteId(note.id);
    try {
      await deleteNote(note.id);
      if (editingNoteId === note.id) {
        cancelEditing();
      }
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note could not be deleted.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function makeTask(note: Note) {
    setError(null);
    setBusyNoteId(note.id);
    try {
      await createTaskFromNote(note.id);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'The task could not be created from this note.');
    } finally {
      setBusyNoteId(null);
    }
  }

  function confirmDeleteNote(note: Note) {
    const attachmentCount = (data?.attachments ?? []).filter(attachment => attachment.noteId === note.id).length;
    Alert.alert(
      'Delete note?',
      attachmentCount > 0 ? `This also deletes ${attachmentCount} attached file${attachmentCount === 1 ? '' : 's'}. This cannot be undone.` : 'This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => void removeNote(note)},
      ],
    );
  }

  async function addNoteAttachment(noteId: string) {
    if ((data?.attachments ?? []).filter(attachment => attachment.noteId === noteId).length >= ATTACHMENT_MAX_PER_NOTE) {
      setError(`A note can have at most ${ATTACHMENT_MAX_PER_NOTE} attachments.`);
      return;
    }
    const createdAt = new Date().toISOString();
    setError(null);
    setBusyNoteId(noteId);
    try {
      const attachment = await importAttachmentFile(noteId, createId('attachment'), createdAt);
      await addAttachment(noteId, attachment);
    } catch (attachmentError) {
      if (!(attachmentError instanceof AttachmentFileCanceled)) {
        setError(attachmentError instanceof Error ? attachmentError.message : 'The attachment could not be added.');
      }
    } finally {
      setBusyNoteId(null);
    }
  }

  async function removeNoteAttachment(attachment: Attachment) {
    setError(null);
    setBusyNoteId(attachment.noteId);
    try {
      await deleteAttachmentFile(attachment.id);
      await deleteAttachment(attachment.id);
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : 'The attachment could not be removed.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function openNoteAttachment(attachment: Attachment) {
    setError(null);
    setBusyNoteId(attachment.noteId);
    try {
      await openAttachmentFile(attachment);
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : 'The attachment could not be opened.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function saveSearch() {
    setError(null);
    try {
      await addSavedSearch({name: savedSearchName, query: searchQuery, showArchived});
      setSavedSearchName('');
    } catch (savedSearchError) {
      setError(savedSearchError instanceof Error ? savedSearchError.message : 'The saved search could not be saved.');
    }
  }

  function applySavedSearch(savedSearch: SavedSearch) {
    setSearchQuery(savedSearch.query);
    setShowArchived(savedSearch.showArchived);
    setError(null);
  }

  function confirmDeleteSavedSearch(savedSearch: SavedSearch) {
    Alert.alert(
      'Delete saved search?',
      `Remove “${savedSearch.name}” from this device?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBusySavedSearchId(savedSearch.id);
            void deleteSavedSearch(savedSearch.id)
              .catch(savedSearchError => setError(savedSearchError instanceof Error ? savedSearchError.message : 'The saved search could not be deleted.'))
              .finally(() => setBusySavedSearchId(null));
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Notes</Text>
        <Text style={styles.pageIntro}>Capture first. Organize more later.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>{editingNoteId ? 'Edit note' : 'New note'}</Text>
          <TextInput
            accessibilityLabel="Note title"
            placeholder="A thought worth keeping"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.formLabel}>Body (optional)</Text>
          <View style={styles.noteMarkupToolbar}>
            <ChipButton label="Bold" selected={false} onPress={() => formatBody('bold')} />
            <ChipButton label="Italic" selected={false} onPress={() => formatBody('italic')} />
            <ChipButton label="Code" selected={false} onPress={() => formatBody('code')} />
            <ChipButton label="Bullet" selected={false} onPress={() => formatBody('bullet')} />
            <ChipButton label="Heading" selected={false} onPress={() => formatBody('heading')} />
          </View>
          <Text style={styles.searchAccessNote}>Formatting is stored as readable text. Plain text still works in search and exports.</Text>
          <TextInput
            accessibilityLabel="Note body"
            placeholder="Write a few lines..."
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={body}
            onChangeText={setBody}
            onSelectionChange={event => setBodySelection(event.nativeEvent.selection)}
            selection={bodySelection}
            multiline
          />
          <Text style={styles.formLabel}>Tags (comma separated, optional)</Text>
          <TextInput
            accessibilityLabel="Note tags"
            placeholder="work, idea, project"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={tags}
            onChangeText={setTags}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={editingNoteId ? 'Update note' : 'Save note'} onPress={() => void save()} />
          {editingNoteId && <TextButton label="Cancel edit" onPress={cancelEditing} />}
        </View>
        <SectionTitle title="Search notes" />
        <TextInput
          accessibilityLabel="Search notes"
          placeholder="Title, body, tag, or attachment name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.trim() && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Save current search</Text>
            <TextInput
              accessibilityLabel="Saved search name"
              placeholder="Name this search"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={savedSearchName}
              onChangeText={setSavedSearchName}
            />
            <TextButton label="Save search" onPress={() => void saveSearch()} />
          </View>
        )}
        {data.savedSearches.length > 0 && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Saved searches</Text>
            {data.savedSearches.map(savedSearch => (
              <View key={savedSearch.id} style={styles.savedSearchRow}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{savedSearch.name}</Text>
                  <Text style={styles.listMeta}>{savedSearch.query}{savedSearch.showArchived ? ' · includes archived' : ''}</Text>
                </View>
                <View style={styles.noteActions}>
                  <TextButton label="Apply" disabled={busySavedSearchId !== null} onPress={() => applySavedSearch(savedSearch)} />
                  <TextButton label="Delete" danger disabled={busySavedSearchId !== null} onPress={() => confirmDeleteSavedSearch(savedSearch)} />
                </View>
              </View>
            ))}
          </View>
        )}
        <TextButton label={showArchived ? 'Hide archived notes' : 'Show archived notes'} onPress={() => setShowArchived(current => !current)} />
        <SectionTitle title={showArchived ? 'All notes' : 'Active notes'} />
        {data.notes.length === 0 ? (
          <EmptyState text="No notes yet." />
        ) : visibleNotes.length === 0 ? (
          <EmptyState text={searchQuery.trim() ? 'No notes match this search.' : 'No active notes. Show archived notes to restore one.'} />
          ) : (
          visibleNotes.map(note => {
            const noteAttachments = data.attachments.filter(attachment => attachment.noteId === note.id);
            const noteLinks = data.noteLinks.filter(link => link.noteId === note.id);
            const isBusy = busyNoteId === note.id;
            const currentLinkOptions = linkingNoteId === note.id ? noteLinkOptions(linkTargetType, data, linkTargetSearch) : [];
            return (
              <View key={note.id} style={styles.noteCard}>
                <Text style={styles.listTitle}>{note.title}</Text>
                {!!note.body && <NoteBodyPreview body={note.body} />}
                {note.tags.length > 0 && <Text style={styles.listMeta}>Tags: {note.tags.map(tag => `#${tag}`).join(' ')}</Text>}
                {note.isPinned && <Text style={styles.successText}>Pinned</Text>}
                {note.isArchived && <Text style={styles.warningText}>Archived</Text>}
                <Text style={styles.listMeta}>{formatDate(note.updatedAt)}</Text>
                {noteLinks.length > 0 && (
                  <View style={styles.linkSection}>
                    <Text style={styles.formLabel}>Linked records</Text>
                    {noteLinks.map(link => (
                      <View key={link.id} style={styles.linkRow}>
                        <Text style={styles.listMeta}>{formatNoteLinkTarget(link, data)}</Text>
                        <TextButton label="Remove link" danger disabled={isBusy} onPress={() => void removeNoteLink(link)} />
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.noteActions}>
                  <TextButton label="Edit" disabled={isBusy} onPress={() => startEditing(note)} />
                  <TextButton label={note.isPinned ? 'Unpin' : 'Pin'} disabled={isBusy} onPress={() => void togglePinned(note)} />
                  <TextButton label={note.isArchived ? 'Restore' : 'Archive'} disabled={isBusy} onPress={() => void changeArchived(note)} />
                  <TextButton label="Make task" disabled={isBusy} onPress={() => void makeTask(note)} />
                  <TextButton label={linkingNoteId === note.id ? 'Cancel link' : 'Link record'} disabled={isBusy} onPress={() => linkingNoteId === note.id ? setLinkingNoteId(null) : startLinking(note)} />
                  <TextButton label="Delete" danger disabled={isBusy} onPress={() => confirmDeleteNote(note)} />
                </View>
                {linkingNoteId === note.id && (
                  <View style={styles.linkEditor}>
                    <Text style={styles.formLabel}>Link type</Text>
                    <View style={styles.chipWrap}>
                      {NOTE_LINK_TARGET_TYPES.map(type => (
                        <ChipButton key={type} label={noteLinkTypeLabel(type)} selected={linkTargetType === type} onPress={() => changeLinkTargetType(type)} />
                      ))}
                    </View>
                    <TextInput
                      accessibilityLabel="Search link targets"
                      placeholder="Search records"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      value={linkTargetSearch}
                      onChangeText={value => {
                        setLinkTargetSearch(value);
                        const first = noteLinkOptions(linkTargetType, data, value)[0];
                        if (first) {
                          setLinkTargetId(first.id);
                        }
                      }}
                    />
                    <View style={styles.chipWrap}>
                      {currentLinkOptions.slice(0, 20).map(option => (
                        <ChipButton key={option.id} label={option.label} selected={linkTargetId === option.id} onPress={() => setLinkTargetId(option.id)} />
                      ))}
                    </View>
                    {currentLinkOptions.length === 0 && <Text style={styles.emptyState}>No matching records.</Text>}
                    <PrimaryButton label="Save link" onPress={() => void saveNoteLink(note)} disabled={isBusy || linkTargetId === null} />
                  </View>
                )}
                {noteAttachments.length > 0 && (
                  <View style={styles.attachmentSection}>
                    <Text style={styles.formLabel}>Attachments</Text>
                    {noteAttachments.map(attachment => (
                      <View key={attachment.id} style={styles.attachmentRow}>
                        <View style={styles.listBody}>
                          <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                          <Text style={styles.listMeta}>{formatBytes(attachment.byteSize)}</Text>
                        </View>
                        <TextButton
                          label="Open attachment"
                          disabled={isBusy}
                          onPress={() => void openNoteAttachment(attachment)}
                        />
                        <TextButton
                          label="Remove attachment"
                          danger
                          disabled={isBusy}
                          onPress={() => void removeNoteAttachment(attachment)}
                        />
                      </View>
                    ))}
                  </View>
                )}
                <PrimaryButton
                  label={isBusy ? 'Working...' : 'Add attachment'}
                  disabled={busyNoteId !== null}
                  onPress={() => void addNoteAttachment(note.id)}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NoteBodyPreview({body}: {body: string}) {
  return (
    <Text style={styles.noteBody} numberOfLines={3}>
      {parseNoteMarkup(body).map((line, lineIndex) => (
        <Text key={`line-${lineIndex}`} style={line.isHeading ? styles.noteHeading : undefined}>
          {lineIndex > 0 ? '\n' : ''}
          {line.isBullet && <Text style={styles.noteBulletMarker}>• </Text>}
          {line.segments.map((segment, segmentIndex) => (
            <Text
              key={`segment-${lineIndex}-${segmentIndex}`}
              style={segment.style === 'bold' ? styles.noteMarkupBold : segment.style === 'italic' ? styles.noteMarkupItalic : segment.style === 'code' ? styles.noteMarkupCode : undefined}>
              {segment.text}
            </Text>
          ))}
        </Text>
      ))}
    </Text>
  );
}

function noteLinkTypeLabel(type: NoteLinkTargetType): string {
  switch (type) {
    case 'task':
      return 'Task';
    case 'project':
      return 'Project';
    case 'money':
      return 'Money';
    case 'focus-session':
      return 'Focus';
  }
}

function noteLinkOptions(type: NoteLinkTargetType, data: AppData, query: string): Array<{id: string; label: string}> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  let options: Array<{id: string; label: string}>;
  switch (type) {
    case 'task':
      options = data.tasks.map(task => ({id: task.id, label: task.title}));
      break;
    case 'project':
      options = data.projects.map(project => ({id: project.id, label: project.isArchived ? `${project.name} (archived)` : project.name}));
      break;
    case 'money':
      options = data.money.map(entry => ({id: entry.id, label: `${formatMoney(entry.amountMinor, entry.currency)} · ${formatDate(entry.occurredAt)}`}));
      break;
    case 'focus-session':
      options = data.focusSessions.map(session => ({id: session.id, label: `Focus · ${formatDate(session.startedAt)}`}));
      break;
  }
  return normalizedQuery ? options.filter(option => option.label.toLocaleLowerCase().includes(normalizedQuery)) : options;
}

function formatNoteLinkTarget(link: NoteLink, data: AppData): string {
  const option = noteLinkOptions(link.targetType, data, '').find(item => item.id === link.targetId);
  return `${noteLinkTypeLabel(link.targetType)}: ${option?.label ?? `Deleted ${noteLinkTypeLabel(link.targetType).toLocaleLowerCase()}`}`;
}

function formatBytes(byteSize: number): string {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }
  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTaskAgendaDay(localDate: string, todayLocalDate: string): string {
  if (localDate === todayLocalDate) {
    return 'Today';
  }
  const [year, month, day] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'short', day: 'numeric'}).format(new Date(year, month - 1, day));
}

function TasksScreen({focusTaskId, focusProjectId, focusTemplateId, onTaskFocusHandled, onProjectFocusHandled, onTemplateFocusHandled}: {focusTaskId: string | null; focusProjectId: string | null; focusTemplateId: string | null; onTaskFocusHandled: () => void; onProjectFocusHandled: () => void; onTemplateFocusHandled: () => void}) {
  const {data, addProject, updateProject, setProjectArchived, deleteProject, addTaskTemplate, updateTaskTemplate, setTaskTemplateArchived, deleteTaskTemplate, createTaskFromTemplate, addTask, updateTask, moveTask, deleteTask, setTaskReminder, deleteTaskReminder, setNotificationQuietHours, toggleTask, addTaskList, updateTaskList, setTaskListArchived, deleteTaskList, addTaskRecurrence, setTaskRecurrencePaused, deleteTaskRecurrence, addTaskDependency, deleteTaskDependency} = useAppStore();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueLocalDate, setDueLocalDate] = useState('');
  const [reminderAtLocalDateTime, setReminderAtLocalDateTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [listId, setListId] = useState(TASK_INBOX_LIST_ID);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('manual');
  const [showAgenda, setShowAgenda] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [taskListError, setTaskListError] = useState<string | null>(null);
  const [busyListId, setBusyListId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectStatus, setProjectStatus] = useState<TaskProject['status']>('active');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDetails, setTemplateDetails] = useState('');
  const [templatePriority, setTemplatePriority] = useState<TaskPriority>('normal');
  const [templateListId, setTemplateListId] = useState(TASK_INBOX_LIST_ID);
  const [templateProjectId, setTemplateProjectId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDetails, setRuleDetails] = useState('');
  const [rulePriority, setRulePriority] = useState<TaskPriority>('normal');
  const [ruleListId, setRuleListId] = useState(TASK_INBOX_LIST_ID);
  const [ruleCadence, setRuleCadence] = useState<RecurrenceCadence>('week');
  const [ruleInterval, setRuleInterval] = useState('1');
  const [ruleNextDate, setRuleNextDate] = useState(localDateKey(new Date()));
  const [ruleReminderLocalTime, setRuleReminderLocalTime] = useState('');
  const [rulePolicy, setRulePolicy] = useState<MissedOccurrencePolicy>('all');
  const [taskRecurrenceError, setTaskRecurrenceError] = useState<string | null>(null);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [quietHoursStartLocalTime, setQuietHoursStartLocalTime] = useState('');
  const [quietHoursEndLocalTime, setQuietHoursEndLocalTime] = useState('');
  const [snoozeDurationMinutes, setSnoozeDurationMinutes] = useState<TaskReminderSnoozeDurationMinutes>(DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES);
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(true);
  const [recurringTaskRemindersEnabled, setRecurringTaskRemindersEnabled] = useState(true);
  const [notificationSettingsError, setNotificationSettingsError] = useState<string | null>(null);
  const [notificationSettingsMessage, setNotificationSettingsMessage] = useState<string | null>(null);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [dependencySourceTaskId, setDependencySourceTaskId] = useState<string | null>(null);
  const [dependencyDependentTaskId, setDependencyDependentTaskId] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [busyDependencyId, setBusyDependencyId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusTaskId || !data) {
      return;
    }
    const task = data.tasks.find(item => item.id === focusTaskId);
    if (!task) {
      onTaskFocusHandled();
      return;
    }
    setFilter('all');
    setTitle(task.title);
    setDetails(task.details);
    setDueLocalDate(task.dueLocalDate ?? '');
    setReminderAtLocalDateTime(task.reminderAtMillis === null ? '' : formatTaskReminderLocalDateTime(task.reminderAtMillis));
    setPriority(task.priority);
    setListId(task.listId);
    setProjectId(task.projectId);
    setParentTaskId(task.parentTaskId);
    setEditingTaskId(task.id);
    setError(null);
    onTaskFocusHandled();
  }, [data, focusTaskId, onTaskFocusHandled]);

  useEffect(() => {
    if (!focusProjectId || !data) {
      return;
    }
    const project = data.projects.find(item => item.id === focusProjectId);
    if (!project) {
      onProjectFocusHandled();
      return;
    }
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectStatus(project.status);
    setProjectError(null);
    onProjectFocusHandled();
  }, [data, focusProjectId, onProjectFocusHandled]);

  useEffect(() => {
    if (!focusTemplateId || !data) {
      return;
    }
    const template = data.templates.find(item => item.id === focusTemplateId);
    if (!template) {
      onTemplateFocusHandled();
      return;
    }
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateTitle(template.title);
    setTemplateDetails(template.details);
    setTemplatePriority(template.priority);
    setTemplateListId(template.listId);
    setTemplateProjectId(template.projectId);
    setTemplateError(null);
    setTemplateMessage(null);
    onTemplateFocusHandled();
  }, [data, focusTemplateId, onTemplateFocusHandled]);

  useEffect(() => {
    if (!data) {
      return;
    }
    setQuietHoursStartLocalTime(data.notificationSettings.quietHoursStartLocalTime ?? '');
    setQuietHoursEndLocalTime(data.notificationSettings.quietHoursEndLocalTime ?? '');
    setSnoozeDurationMinutes(data.notificationSettings.snoozeDurationMinutes);
    setTaskRemindersEnabled(data.notificationSettings.taskRemindersEnabled);
    setRecurringTaskRemindersEnabled(data.notificationSettings.recurringTaskRemindersEnabled);
  }, [data?.notificationSettings.quietHoursStartLocalTime, data?.notificationSettings.quietHoursEndLocalTime, data?.notificationSettings.snoozeDurationMinutes, data?.notificationSettings.taskRemindersEnabled, data?.notificationSettings.recurringTaskRemindersEnabled]);

  if (!data) {
    return null;
  }

  const currentData = data;
  const subtaskCountByParent = useMemo(() => {
    const counts = new Map<string, number>();
    currentData.tasks.forEach(task => {
      if (task.parentTaskId !== null) {
        counts.set(task.parentTaskId, (counts.get(task.parentTaskId) ?? 0) + 1);
      }
    });
    return counts;
  }, [currentData.tasks]);
  const taskListIds = new Set(currentData.taskLists.map(taskList => taskList.id));
  const projectIds = new Set(currentData.projects.map(project => project.id));
  const todayLocalDate = localDateKey(new Date());
  const visibleTasks = sortTasks(filterTasks(currentData.tasks, filter, todayLocalDate), taskSort);
  const agendaDays = buildTaskAgenda(currentData.tasks, todayLocalDate, 14);

  function resetForm() {
    setTitle('');
    setDetails('');
    setDueLocalDate('');
    setReminderAtLocalDateTime('');
    setPriority('normal');
    setListId(currentData.taskLists.find(taskList => taskList.id === TASK_INBOX_LIST_ID)?.id ?? currentData.taskLists[0]?.id ?? TASK_INBOX_LIST_ID);
    setProjectId(null);
    setParentTaskId(null);
    setEditingTaskId(null);
  }

  function startEditing(task: Task) {
    setTitle(task.title);
    setDetails(task.details);
    setDueLocalDate(task.dueLocalDate ?? '');
    setReminderAtLocalDateTime(task.reminderAtMillis === null ? '' : formatTaskReminderLocalDateTime(task.reminderAtMillis));
    setPriority(task.priority);
    setListId(task.listId);
    setProjectId(task.projectId);
    setParentTaskId(task.parentTaskId);
    setEditingTaskId(task.id);
    setError(null);
  }

  async function save() {
    const draft: TaskDraft = {
      title,
      details,
      dueLocalDate: dueLocalDate.trim() || null,
      priority,
      listId,
      projectId,
      parentTaskId,
    };
    const validationError = validateTaskDraft(draft, taskListIds, projectIds);
    if (validationError) {
      setError(validationError);
      return;
    }
    const reminderInput = reminderAtLocalDateTime.trim();
    let reminderAtMillis: number | null = null;
    if (reminderInput) {
      const reminderError = validateTaskReminderDraft(reminderInput);
      if (reminderError) {
        setError(reminderError);
        return;
      }
      reminderAtMillis = parseTaskReminderLocalDateTime(reminderInput);
    }
    setError(null);
    try {
      if (editingTaskId) {
        await updateTask(editingTaskId, draft);
        if (reminderAtMillis === null) {
          await deleteTaskReminder(editingTaskId);
        } else {
          await setTaskReminder(editingTaskId, reminderAtMillis);
        }
      } else {
        const taskId = await addTask(draft);
        if (reminderAtMillis !== null) {
          await setTaskReminder(taskId, reminderAtMillis);
        }
      }
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The task could not be saved.');
    }
  }

  async function removeTask(taskId: string) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      await deleteTask(taskId);
      if (editingTaskId === taskId) {
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The task could not be deleted.');
    } finally {
      setBusyTaskId(null);
    }
  }

  function confirmDelete(task: Task) {
    Alert.alert('Delete task?', `Delete "${task.title}"? This cannot be undone.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeTask(task.id)},
    ]);
  }

  function startEditingProject(project: TaskProject) {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectStatus(project.status);
    setProjectError(null);
  }

  function resetProjectForm() {
    setEditingProjectId(null);
    setProjectName('');
    setProjectStatus('active');
    setProjectError(null);
  }

  async function saveProject() {
    const draft: ProjectDraft = {name: projectName, status: projectStatus};
    const validationError = validateProjectDraft(draft);
    if (validationError) {
      setProjectError(validationError);
      return;
    }
    setProjectError(null);
    try {
      if (editingProjectId) {
        await updateProject(editingProjectId, draft);
      } else {
        await addProject(draft);
      }
      resetProjectForm();
    } catch (saveError) {
      setProjectError(saveError instanceof Error ? saveError.message : 'The project could not be saved.');
    }
  }

  async function toggleProjectArchived(project: TaskProject) {
    setBusyProjectId(project.id);
    setProjectError(null);
    try {
      await setProjectArchived(project.id, !project.isArchived);
      if (!project.isArchived && projectId === project.id && !editingTaskId) {
        setProjectId(null);
      }
    } catch (archiveError) {
      setProjectError(archiveError instanceof Error ? archiveError.message : 'The project archive state could not be changed.');
    } finally {
      setBusyProjectId(null);
    }
  }

  async function toggleProjectStatus(project: TaskProject) {
    setBusyProjectId(project.id);
    setProjectError(null);
    try {
      await updateProject(project.id, {name: project.name, status: project.status === 'active' ? 'completed' : 'active'});
    } catch (statusError) {
      setProjectError(statusError instanceof Error ? statusError.message : 'The project status could not be changed.');
    } finally {
      setBusyProjectId(null);
    }
  }

  async function removeProject(projectIdToRemove: string) {
    setBusyProjectId(projectIdToRemove);
    setProjectError(null);
    try {
      await deleteProject(projectIdToRemove);
      if (projectId === projectIdToRemove) {
        setProjectId(null);
      }
      if (editingProjectId === projectIdToRemove) {
        resetProjectForm();
      }
    } catch (deleteError) {
      setProjectError(deleteError instanceof Error ? deleteError.message : 'The project could not be deleted.');
    } finally {
      setBusyProjectId(null);
    }
  }

  function confirmDeleteProject(project: TaskProject) {
    Alert.alert('Delete project?', `Delete "${project.name}"? Projects with tasks cannot be deleted.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeProject(project.id)},
    ]);
  }

  function startEditingTemplate(template: TaskTemplate) {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateTitle(template.title);
    setTemplateDetails(template.details);
    setTemplatePriority(template.priority);
    setTemplateListId(template.listId);
    setTemplateProjectId(template.projectId);
    setTemplateError(null);
    setTemplateMessage(null);
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateTitle('');
    setTemplateDetails('');
    setTemplatePriority('normal');
    setTemplateListId(currentData.taskLists.find(taskList => taskList.id === TASK_INBOX_LIST_ID && !taskList.isArchived)?.id ?? currentData.taskLists.find(taskList => !taskList.isArchived)?.id ?? TASK_INBOX_LIST_ID);
    setTemplateProjectId(null);
    setTemplateError(null);
  }

  async function saveTemplate() {
    const draft: TaskTemplateDraft = {
      name: templateName,
      title: templateTitle,
      details: templateDetails,
      priority: templatePriority,
      listId: templateListId,
      projectId: templateProjectId,
    };
    const validationError = validateTaskTemplateDraft(draft, taskListIds, projectIds);
    if (validationError) {
      setTemplateError(validationError);
      return;
    }
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      if (editingTemplateId) {
        await updateTaskTemplate(editingTemplateId, draft);
      } else {
        await addTaskTemplate(draft);
      }
      resetTemplateForm();
    } catch (saveError) {
      setTemplateError(saveError instanceof Error ? saveError.message : 'The task template could not be saved.');
    }
  }

  async function useTemplate(template: TaskTemplate) {
    setBusyTemplateId(template.id);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      await createTaskFromTemplate(template.id);
      setTemplateMessage(`Created task from ${template.name}.`);
    } catch (useError) {
      setTemplateError(useError instanceof Error ? useError.message : 'The task template could not be used.');
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function toggleTemplateArchived(template: TaskTemplate) {
    setBusyTemplateId(template.id);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      await setTaskTemplateArchived(template.id, !template.isArchived);
      if (!template.isArchived && editingTemplateId === template.id) {
        resetTemplateForm();
      }
    } catch (archiveError) {
      setTemplateError(archiveError instanceof Error ? archiveError.message : 'The task template archive state could not be changed.');
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function removeTemplate(templateId: string) {
    setBusyTemplateId(templateId);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      await deleteTaskTemplate(templateId);
      if (editingTemplateId === templateId) {
        resetTemplateForm();
      }
    } catch (deleteError) {
      setTemplateError(deleteError instanceof Error ? deleteError.message : 'The task template could not be deleted.');
    } finally {
      setBusyTemplateId(null);
    }
  }

  function confirmDeleteTemplate(template: TaskTemplate) {
    Alert.alert('Delete task template?', `Delete "${template.name}"? Existing tasks stay.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeTemplate(template.id)},
    ]);
  }

  function startEditingList(taskList: typeof currentData.taskLists[number]) {
    setEditingListId(taskList.id);
    setEditingListName(taskList.name);
    setTaskListError(null);
  }

  function resetListForm() {
    setNewListName('');
    setEditingListId(null);
    setEditingListName('');
    setTaskListError(null);
  }

  function resetRuleForm() {
    setRuleTitle('');
    setRuleDetails('');
    setRulePriority('normal');
    setRuleListId(currentData.taskLists.find(taskList => taskList.id === TASK_INBOX_LIST_ID)?.id ?? currentData.taskLists[0]?.id ?? TASK_INBOX_LIST_ID);
    setRuleCadence('week');
    setRuleInterval('1');
    setRuleNextDate(localDateKey(new Date()));
    setRuleReminderLocalTime('');
    setRulePolicy('all');
  }

  async function saveRule() {
    const draft: TaskRecurrenceDraft = {
      title: ruleTitle,
      details: ruleDetails,
      priority: rulePriority,
      listId: ruleListId,
      cadence: ruleCadence,
      interval: Number(ruleInterval.trim()),
      nextOccurrenceLocalDate: ruleNextDate.trim(),
      missedOccurrencePolicy: rulePolicy,
      reminderLocalTime: ruleReminderLocalTime.trim() || null,
    };
    const validationError = validateTaskRecurrenceDraft(draft, taskListIds);
    if (validationError) {
      setTaskRecurrenceError(validationError);
      return;
    }
    setTaskRecurrenceError(null);
    try {
      await addTaskRecurrence(draft);
      resetRuleForm();
    } catch (ruleError) {
      setTaskRecurrenceError(ruleError instanceof Error ? ruleError.message : 'The recurring task could not be saved.');
    }
  }

  async function saveNotificationSettings() {
    setSavingNotificationSettings(true);
    setNotificationSettingsError(null);
    setNotificationSettingsMessage(null);
    try {
      await setNotificationQuietHours(quietHoursStartLocalTime, quietHoursEndLocalTime, snoozeDurationMinutes, taskRemindersEnabled, recurringTaskRemindersEnabled);
      setNotificationSettingsMessage(taskRemindersEnabled ? (quietHoursStartLocalTime.trim() ? 'Notification settings saved.' : 'Notification settings saved; quiet hours disabled.') : 'Task reminders paused. Reminder times remain saved.');
    } catch (settingsError) {
      setNotificationSettingsError(settingsError instanceof Error ? settingsError.message : 'Notification settings could not be saved.');
    } finally {
      setSavingNotificationSettings(false);
    }
  }

  async function saveDependency() {
    if (!dependencySourceTaskId || !dependencyDependentTaskId) {
      setDependencyError('Choose the task that must finish and the task that waits.');
      return;
    }
    setBusyDependencyId('new');
    setDependencyError(null);
    try {
      await addTaskDependency(dependencySourceTaskId, dependencyDependentTaskId);
      setDependencySourceTaskId(null);
      setDependencyDependentTaskId(null);
    } catch (dependencySaveError) {
      setDependencyError(dependencySaveError instanceof Error ? dependencySaveError.message : 'The task dependency could not be saved.');
    } finally {
      setBusyDependencyId(null);
    }
  }

  async function removeDependency(dependencyId: string) {
    setBusyDependencyId(dependencyId);
    setDependencyError(null);
    try {
      await deleteTaskDependency(dependencyId);
    } catch (dependencyDeleteError) {
      setDependencyError(dependencyDeleteError instanceof Error ? dependencyDeleteError.message : 'The task dependency could not be deleted.');
    } finally {
      setBusyDependencyId(null);
    }
  }

  async function toggleTaskFromList(taskId: string) {
    setError(null);
    try {
      await toggleTask(taskId);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The task could not be updated.');
    }
  }

  async function moveTaskFromList(taskId: string, direction: 'up' | 'down') {
    setError(null);
    try {
      await moveTask(taskId, direction);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'The task order could not be changed.');
    }
  }

  async function toggleRule(rule: typeof currentData.taskRecurrences[number]) {
    setBusyRuleId(rule.id);
    setTaskRecurrenceError(null);
    try {
      await setTaskRecurrencePaused(rule.id, !rule.isPaused);
    } catch (ruleError) {
      setTaskRecurrenceError(ruleError instanceof Error ? ruleError.message : 'The recurring task could not be updated.');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function removeRule(ruleId: string) {
    setBusyRuleId(ruleId);
    setTaskRecurrenceError(null);
    try {
      await deleteTaskRecurrence(ruleId);
    } catch (ruleError) {
      setTaskRecurrenceError(ruleError instanceof Error ? ruleError.message : 'The recurring task could not be deleted.');
    } finally {
      setBusyRuleId(null);
    }
  }

  function confirmDeleteRule(rule: typeof currentData.taskRecurrences[number]) {
    Alert.alert('Delete recurring task?', `Delete the rule for "${rule.title}"? Existing tasks stay.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeRule(rule.id)},
    ]);
  }

  async function saveList() {
    const draft = {name: editingListId ? editingListName : newListName};
    const validationError = validateTaskListDraft(draft, currentData.taskLists, editingListId);
    if (validationError) {
      setTaskListError(validationError);
      return;
    }
    setTaskListError(null);
    try {
      if (editingListId) {
        await updateTaskList(editingListId, draft);
      } else {
        await addTaskList(draft);
      }
      resetListForm();
    } catch (listError) {
      setTaskListError(listError instanceof Error ? listError.message : 'The task list could not be saved.');
    }
  }

  async function toggleListArchived(taskList: typeof currentData.taskLists[number]) {
    setBusyListId(taskList.id);
    setTaskListError(null);
    try {
      await setTaskListArchived(taskList.id, !taskList.isArchived);
      if (!taskList.isArchived && listId === taskList.id && !editingTaskId) {
        resetForm();
      }
    } catch (listError) {
      setTaskListError(listError instanceof Error ? listError.message : 'The task list archive state could not be changed.');
    } finally {
      setBusyListId(null);
    }
  }

  async function removeList(listIdToRemove: string) {
    setBusyListId(listIdToRemove);
    setTaskListError(null);
    try {
      await deleteTaskList(listIdToRemove);
      if (listId === listIdToRemove) {
        resetForm();
      }
      if (editingListId === listIdToRemove) {
        resetListForm();
      }
    } catch (listError) {
      setTaskListError(listError instanceof Error ? listError.message : 'The task list could not be deleted.');
    } finally {
      setBusyListId(null);
    }
  }

  async function addTaskToCalendar(task: Task) {
    if (!calendarDrafts.isSupported()) {
      setError('Calendar export is available on Android only.');
      return;
    }
    const draft = {
      title: task.title,
      details: task.details,
      dueLocalDate: task.dueLocalDate ?? '',
    };
    const validationError = validateCalendarTaskDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      const opened = await calendarDrafts.openTaskDraft(draft);
      if (!opened) {
        setError('No calendar editor is available on this device.');
      }
    } catch (calendarError) {
      setError(calendarError instanceof Error ? calendarError.message : 'The calendar editor could not be opened.');
    }
  }

  function confirmDeleteList(taskList: typeof currentData.taskLists[number]) {
    Alert.alert('Delete task list?', `Delete "${taskList.name}"? Lists with tasks cannot be deleted.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeList(taskList.id)},
    ]);
  }

  function renderTaskRow(task: Task, allowManualMove: boolean) {
    const sourceLabel = getTaskSourceLabel(task, currentData.notes);
    const taskList = currentData.taskLists.find(taskListItem => taskListItem.id === task.listId);
    const project = task.projectId === null ? null : currentData.projects.find(projectItem => projectItem.id === task.projectId);
    const subtaskCount = subtaskCountByParent.get(task.id) ?? 0;
    return (
      <View key={task.id} style={styles.taskRow}>
        <Pressable accessibilityLabel={task.status === 'open' ? `Complete ${task.title}` : `Reopen ${task.title}`} accessibilityRole="button" style={styles.taskToggle} onPress={() => void toggleTaskFromList(task.id)}>
          <View style={[styles.checkbox, task.status === 'completed' && styles.checkboxDone]}>
            {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.listBody}>
            <Text style={[styles.listTitle, task.status === 'completed' && styles.completedText]}>{task.title}</Text>
            {!!task.details && <Text style={styles.listMeta} numberOfLines={1}>{task.details}</Text>}
            <Text style={styles.listMeta}>{[task.priority, taskList?.name ?? 'Deleted list', project?.name ?? (task.projectId === null ? null : 'Deleted project'), task.parentTaskId === null ? null : `Subtask of ${currentData.tasks.find(parent => parent.id === task.parentTaskId)?.title ?? 'Deleted task'}`, subtaskCount > 0 ? `${subtaskCount} subtasks` : null, task.dueLocalDate ? `Due ${task.dueLocalDate}` : 'No due date', task.reminderAtMillis !== null ? `Reminder ${formatTaskReminderLocalDateTime(task.reminderAtMillis)}` : null].filter(Boolean).join(' · ')}</Text>
            {sourceLabel && <Text style={styles.listMeta}>{sourceLabel}</Text>}
            {getBlockingTaskIds(task.id, currentData.tasks, currentData.taskDependencies).map(blockingTaskId => {
              const blockingTask = currentData.tasks.find(item => item.id === blockingTaskId);
              return blockingTask ? <Text key={blockingTaskId} style={styles.warningText}>Blocked by {blockingTask.title}</Text> : null;
            })}
          </View>
        </Pressable>
        <View style={styles.taskActions}>
          {allowManualMove && <TextButton label="Up" onPress={() => void moveTaskFromList(task.id, 'up')} />}
          {allowManualMove && <TextButton label="Down" onPress={() => void moveTaskFromList(task.id, 'down')} />}
          <TextButton label="Calendar" onPress={() => void addTaskToCalendar(task)} disabled={busyTaskId !== null} />
          <TextButton label="Edit" onPress={() => startEditing(task)} disabled={busyTaskId !== null} />
          <TextButton label="Delete" danger onPress={() => confirmDelete(task)} disabled={busyTaskId !== null} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Tasks</Text>
        <Text style={styles.pageIntro}>Keep one next action visible.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>{editingTaskId ? 'Edit task' : 'New task'}</Text>
          <TextInput accessibilityLabel="Task title" placeholder="What needs doing?" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.formLabel}>Details (optional)</Text>
          <TextInput accessibilityLabel="Task details" placeholder="Add context..." placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={details} onChangeText={setDetails} multiline />
          <Text style={styles.formLabel}>Due date (optional)</Text>
          <TextInput accessibilityLabel="Task due date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={dueLocalDate} onChangeText={setDueLocalDate} autoCapitalize="none" />
          <Text style={styles.formLabel}>Reminder (optional)</Text>
          <TextInput accessibilityLabel="Task reminder time" placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.muted} style={styles.input} value={reminderAtLocalDateTime} onChangeText={setReminderAtLocalDateTime} autoCapitalize="none" />
          <Text style={styles.formLabel}>Priority</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Low" selected={priority === 'low'} onPress={() => setPriority('low')} />
            <SegmentButton label="Normal" selected={priority === 'normal'} onPress={() => setPriority('normal')} />
            <SegmentButton label="High" selected={priority === 'high'} onPress={() => setPriority('high')} />
          </View>
          <Text style={styles.formLabel}>List</Text>
          <View style={styles.segmentRow}>
            {data.taskLists.filter(taskList => !taskList.isArchived).map(taskList => (
              <SegmentButton key={taskList.id} label={taskList.name} selected={listId === taskList.id} onPress={() => setListId(taskList.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Project (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No project" selected={projectId === null} onPress={() => setProjectId(null)} />
            {data.projects.filter(project => !project.isArchived || project.id === projectId).map(project => (
              <SegmentButton key={project.id} label={project.name} selected={projectId === project.id} onPress={() => setProjectId(project.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Parent task (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No parent" selected={parentTaskId === null} onPress={() => setParentTaskId(null)} />
            {currentData.tasks.filter(task => task.id !== editingTaskId && task.listId === listId).map(task => (
              <SegmentButton key={task.id} label={task.title} selected={parentTaskId === task.id} onPress={() => setParentTaskId(task.id)} />
            ))}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={editingTaskId ? 'Update task' : 'Add task'} onPress={() => void save()} />
          {editingTaskId && <TextButton label="Cancel edit" onPress={resetForm} />}
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Notification settings</Text>
          <Text style={styles.formLabel}>Task reminders</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="On" selected={taskRemindersEnabled} onPress={() => setTaskRemindersEnabled(true)} />
            <SegmentButton label="Off" selected={!taskRemindersEnabled} onPress={() => setTaskRemindersEnabled(false)} />
          </View>
          <Text style={styles.cardDetail}>Off removes native reminder alarms but keeps reminder times on your tasks.</Text>
          <Text style={styles.formLabel}>Recurring task reminders</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="On" selected={recurringTaskRemindersEnabled} onPress={() => setRecurringTaskRemindersEnabled(true)} />
            <SegmentButton label="Off" selected={!recurringTaskRemindersEnabled} onPress={() => setRecurringTaskRemindersEnabled(false)} />
          </View>
          <Text style={styles.cardDetail}>Off pauses reminders on tasks created from recurring rules. One-off task reminders stay active.</Text>
          <Text style={styles.searchAccessNote}>Reminders that fall inside quiet hours are delivered at the quiet-hours end.</Text>
          <View style={styles.segmentRow}>
            <TextInput accessibilityLabel="Quiet hours start" placeholder="Start HH:mm" placeholderTextColor={colors.muted} style={[styles.input, styles.quietHoursInput]} value={quietHoursStartLocalTime} onChangeText={setQuietHoursStartLocalTime} autoCapitalize="none" />
            <TextInput accessibilityLabel="Quiet hours end" placeholder="End HH:mm" placeholderTextColor={colors.muted} style={[styles.input, styles.quietHoursInput]} value={quietHoursEndLocalTime} onChangeText={setQuietHoursEndLocalTime} autoCapitalize="none" />
          </View>
          <Text style={styles.formLabel}>Snooze duration</Text>
          <View style={styles.segmentRow}>
            {TASK_REMINDER_SNOOZE_DURATION_OPTIONS.map(duration => (
              <SegmentButton key={duration} label={duration < 60 ? `${duration}m` : `${duration / 60}h`} selected={snoozeDurationMinutes === duration} onPress={() => setSnoozeDurationMinutes(duration)} />
            ))}
          </View>
          {notificationSettingsError && <Text style={styles.errorText}>{notificationSettingsError}</Text>}
          {notificationSettingsMessage && <Text style={styles.successText}>{notificationSettingsMessage}</Text>}
          <PrimaryButton label={savingNotificationSettings ? 'Saving...' : 'Save notification settings'} onPress={() => void saveNotificationSettings()} disabled={savingNotificationSettings} />
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Task dependencies</Text>
          <Text style={styles.cardDetail}>Make one task wait until another task is completed. Cycles are rejected.</Text>
          <Text style={styles.formLabel}>Must finish first</Text>
          <View style={styles.chipWrap}>
            {currentData.tasks.map(task => (
              <ChipButton key={`source-${task.id}`} label={task.title} selected={dependencySourceTaskId === task.id} onPress={() => {setDependencySourceTaskId(task.id); setDependencyError(null);}} />
            ))}
          </View>
          <Text style={styles.formLabel}>Task that waits</Text>
          <View style={styles.chipWrap}>
            {currentData.tasks.filter(task => task.id !== dependencySourceTaskId).map(task => (
              <ChipButton key={`dependent-${task.id}`} label={task.title} selected={dependencyDependentTaskId === task.id} onPress={() => {setDependencyDependentTaskId(task.id); setDependencyError(null);}} />
            ))}
          </View>
          {dependencyError && <Text style={styles.errorText}>{dependencyError}</Text>}
          <PrimaryButton label={busyDependencyId === 'new' ? 'Saving...' : 'Add dependency'} onPress={() => void saveDependency()} disabled={busyDependencyId !== null || dependencySourceTaskId === null || dependencyDependentTaskId === null} />
          {currentData.taskDependencies.length === 0 ? (
            <Text style={styles.cardDetail}>No task dependencies yet.</Text>
          ) : currentData.taskDependencies.map(dependency => {
            const sourceTask = currentData.tasks.find(task => task.id === dependency.sourceTaskId);
            const dependentTask = currentData.tasks.find(task => task.id === dependency.dependentTaskId);
            return (
              <View key={dependency.id} style={styles.taskListRow}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{dependentTask?.title ?? 'Deleted task'} waits for {sourceTask?.title ?? 'Deleted task'}</Text>
                  <Text style={styles.listMeta}>The prerequisite must be completed first.</Text>
                </View>
                <TextButton label="Delete" danger onPress={() => void removeDependency(dependency.id)} disabled={busyDependencyId !== null} />
              </View>
            );
          })}
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>{editingProjectId ? 'Edit project' : 'Projects'}</Text>
          <TextInput
            accessibilityLabel="Project name"
            placeholder="Project name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={projectName}
            onChangeText={setProjectName}
          />
          <Text style={styles.formLabel}>Status</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Active" selected={projectStatus === 'active'} onPress={() => setProjectStatus('active')} />
            <SegmentButton label="Completed" selected={projectStatus === 'completed'} onPress={() => setProjectStatus('completed')} />
          </View>
          {projectError && <Text style={styles.errorText}>{projectError}</Text>}
          <PrimaryButton label={editingProjectId ? 'Update project' : 'Add project'} onPress={() => void saveProject()} />
          {editingProjectId && <TextButton label="Cancel project edit" onPress={resetProjectForm} />}
          {currentData.projects.length === 0 ? (
            <Text style={styles.cardDetail}>No projects yet.</Text>
          ) : currentData.projects.map(project => (
            <View key={project.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{project.name}</Text>
                <Text style={styles.listMeta}>{project.status === 'completed' ? 'Completed' : 'Active'}{project.isArchived ? ' · Archived' : ''}</Text>
              </View>
              <View style={styles.taskListActions}>
                <TextButton label={project.status === 'completed' ? 'Reopen' : 'Complete'} onPress={() => void toggleProjectStatus(project)} disabled={busyProjectId !== null} />
                <TextButton label="Edit" onPress={() => startEditingProject(project)} disabled={busyProjectId !== null} />
                <TextButton label={project.isArchived ? 'Restore' : 'Archive'} onPress={() => void toggleProjectArchived(project)} disabled={busyProjectId !== null} />
                <TextButton label="Delete" danger onPress={() => confirmDeleteProject(project)} disabled={busyProjectId !== null} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>{editingTemplateId ? 'Edit task template' : 'Task templates'}</Text>
          <TextInput accessibilityLabel="Task template name" placeholder="Template name" placeholderTextColor={colors.muted} style={styles.input} value={templateName} onChangeText={setTemplateName} />
          <TextInput accessibilityLabel="Task template title" placeholder="Task title" placeholderTextColor={colors.muted} style={styles.input} value={templateTitle} onChangeText={setTemplateTitle} />
          <TextInput accessibilityLabel="Task template details" placeholder="Details (optional)" placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={templateDetails} onChangeText={setTemplateDetails} multiline />
          <Text style={styles.formLabel}>Priority</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Low" selected={templatePriority === 'low'} onPress={() => setTemplatePriority('low')} />
            <SegmentButton label="Normal" selected={templatePriority === 'normal'} onPress={() => setTemplatePriority('normal')} />
            <SegmentButton label="High" selected={templatePriority === 'high'} onPress={() => setTemplatePriority('high')} />
          </View>
          <Text style={styles.formLabel}>List</Text>
          <View style={styles.segmentRow}>
            {currentData.taskLists.filter(taskList => !taskList.isArchived || taskList.id === templateListId).map(taskList => (
              <SegmentButton key={taskList.id} label={taskList.name} selected={templateListId === taskList.id} onPress={() => setTemplateListId(taskList.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Project (optional)</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="No project" selected={templateProjectId === null} onPress={() => setTemplateProjectId(null)} />
            {currentData.projects.filter(project => !project.isArchived || project.id === templateProjectId).map(project => (
              <SegmentButton key={project.id} label={project.name} selected={templateProjectId === project.id} onPress={() => setTemplateProjectId(project.id)} />
            ))}
          </View>
          {templateError && <Text style={styles.errorText}>{templateError}</Text>}
          {templateMessage && <Text style={styles.successText}>{templateMessage}</Text>}
          <PrimaryButton label={editingTemplateId ? 'Update template' : 'Add template'} onPress={() => void saveTemplate()} />
          {editingTemplateId && <TextButton label="Cancel template edit" onPress={resetTemplateForm} />}
          {currentData.templates.length === 0 ? (
            <Text style={styles.cardDetail}>No task templates yet.</Text>
          ) : currentData.templates.map(template => (
            <View key={template.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{template.name}</Text>
                <Text style={styles.listMeta}>{template.title} · {template.priority}{template.isArchived ? ' · Archived' : ''}</Text>
              </View>
              <View style={styles.taskListActions}>
                {!template.isArchived && <TextButton label="Use" onPress={() => void useTemplate(template)} disabled={busyTemplateId !== null} />}
                <TextButton label="Edit" onPress={() => startEditingTemplate(template)} disabled={busyTemplateId !== null} />
                <TextButton label={template.isArchived ? 'Restore' : 'Archive'} onPress={() => void toggleTemplateArchived(template)} disabled={busyTemplateId !== null} />
                <TextButton label="Delete" danger onPress={() => confirmDeleteTemplate(template)} disabled={busyTemplateId !== null} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>{editingListId ? 'Rename task list' : 'Task lists'}</Text>
          <TextInput
            accessibilityLabel="Task list name"
            placeholder="New list name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={editingListId ? editingListName : newListName}
            onChangeText={editingListId ? setEditingListName : setNewListName}
          />
          {taskListError && <Text style={styles.errorText}>{taskListError}</Text>}
          <PrimaryButton label={editingListId ? 'Rename list' : 'Add list'} onPress={() => void saveList()} />
          {editingListId && <TextButton label="Cancel rename" onPress={resetListForm} />}
          {currentData.taskLists.map(taskList => (
            <View key={taskList.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{taskList.name}</Text>
                <Text style={styles.listMeta}>{taskList.isArchived ? 'Archived' : 'Active'}{taskList.id === TASK_INBOX_LIST_ID ? ' · Default' : ''}</Text>
              </View>
              <View style={styles.taskListActions}>
                <TextButton label="Rename" onPress={() => startEditingList(taskList)} disabled={busyListId !== null} />
                <TextButton label={taskList.isArchived ? 'Restore' : 'Archive'} onPress={() => void toggleListArchived(taskList)} disabled={busyListId !== null} />
                {taskList.id !== TASK_INBOX_LIST_ID && <TextButton label="Delete" danger onPress={() => confirmDeleteList(taskList)} disabled={busyListId !== null} />}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Recurring tasks</Text>
          <TextInput accessibilityLabel="Recurring task title" placeholder="What repeats?" placeholderTextColor={colors.muted} style={styles.input} value={ruleTitle} onChangeText={setRuleTitle} />
          <Text style={styles.formLabel}>Details (optional)</Text>
          <TextInput accessibilityLabel="Recurring task details" placeholder="Add context..." placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={ruleDetails} onChangeText={setRuleDetails} multiline />
          <Text style={styles.formLabel}>First due date</Text>
          <TextInput accessibilityLabel="Recurring task first due date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={ruleNextDate} onChangeText={setRuleNextDate} autoCapitalize="none" />
          <Text style={styles.formLabel}>Reminder time (optional)</Text>
          <TextInput accessibilityLabel="Recurring task reminder time" placeholder="HH:mm" placeholderTextColor={colors.muted} style={styles.input} value={ruleReminderLocalTime} onChangeText={setRuleReminderLocalTime} autoCapitalize="none" />
          <Text style={styles.formLabel}>Repeat every</Text>
          <View style={styles.segmentRow}>
            <TextInput accessibilityLabel="Recurring task interval" placeholder="1" placeholderTextColor={colors.muted} style={[styles.input, styles.smallInput]} value={ruleInterval} onChangeText={setRuleInterval} keyboardType="number-pad" />
            <SegmentButton label="Day" selected={ruleCadence === 'day'} onPress={() => setRuleCadence('day')} />
            <SegmentButton label="Week" selected={ruleCadence === 'week'} onPress={() => setRuleCadence('week')} />
            <SegmentButton label="Month" selected={ruleCadence === 'month'} onPress={() => setRuleCadence('month')} />
          </View>
          <Text style={styles.formLabel}>Priority</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Low" selected={rulePriority === 'low'} onPress={() => setRulePriority('low')} />
            <SegmentButton label="Normal" selected={rulePriority === 'normal'} onPress={() => setRulePriority('normal')} />
            <SegmentButton label="High" selected={rulePriority === 'high'} onPress={() => setRulePriority('high')} />
          </View>
          <Text style={styles.formLabel}>List</Text>
          <View style={styles.segmentRow}>
            {data.taskLists.filter(taskList => !taskList.isArchived).map(taskList => (
              <SegmentButton key={taskList.id} label={taskList.name} selected={ruleListId === taskList.id} onPress={() => setRuleListId(taskList.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Missed occurrences</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="All" selected={rulePolicy === 'all'} onPress={() => setRulePolicy('all')} />
            <SegmentButton label="One" selected={rulePolicy === 'one'} onPress={() => setRulePolicy('one')} />
            <SegmentButton label="Skip" selected={rulePolicy === 'skip'} onPress={() => setRulePolicy('skip')} />
          </View>
          {taskRecurrenceError && <Text style={styles.errorText}>{taskRecurrenceError}</Text>}
          <PrimaryButton label="Add recurring task" onPress={() => void saveRule()} />
          {currentData.taskRecurrences.map(rule => (
            <View key={rule.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{rule.title}</Text>
                <Text style={styles.listMeta}>{rule.cadence} every {rule.interval} · next {rule.nextOccurrenceLocalDate} · missed {rule.missedOccurrencePolicy}{rule.reminderLocalTime ? ` · reminder ${rule.reminderLocalTime}` : ''}{rule.isPaused ? ' · Paused' : ''}</Text>
              </View>
              <View style={styles.taskListActions}>
                <TextButton label={rule.isPaused ? 'Resume' : 'Pause'} onPress={() => void toggleRule(rule)} disabled={busyRuleId !== null} />
                <TextButton label="Delete" danger onPress={() => confirmDeleteRule(rule)} disabled={busyRuleId !== null} />
              </View>
            </View>
          ))}
        </View>
        <SectionTitle title="Task view" />
        <View style={styles.segmentRow}>
          <SegmentButton label="List" selected={!showAgenda} onPress={() => setShowAgenda(false)} />
          <SegmentButton label="Agenda" selected={showAgenda} onPress={() => setShowAgenda(true)} />
        </View>
        {showAgenda ? (
          <View>
            <Text style={styles.searchAccessNote}>Due tasks for the next 14 device-local calendar days.</Text>
            {agendaDays.length === 0 ? (
              <EmptyState text="No dated tasks in the next 14 days." />
            ) : agendaDays.map(day => (
              <View key={day.localDate}>
                <SectionTitle title={formatTaskAgendaDay(day.localDate, todayLocalDate)} />
                {day.tasks.map(task => renderTaskRow(task, false))}
              </View>
            ))}
          </View>
        ) : (
          <View>
            <View style={styles.segmentRow}>
              <SegmentButton label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
              <SegmentButton label="Overdue" selected={filter === 'overdue'} onPress={() => setFilter('overdue')} />
              <SegmentButton label="Today" selected={filter === 'today'} onPress={() => setFilter('today')} />
              <SegmentButton label="Upcoming" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
              <SegmentButton label="Completed" selected={filter === 'completed'} onPress={() => setFilter('completed')} />
            </View>
            <Text style={styles.formLabel}>Sort list</Text>
            <View style={styles.segmentRow}>
              <SegmentButton label="Manual" selected={taskSort === 'manual'} onPress={() => setTaskSort('manual')} />
              <SegmentButton label="Due date" selected={taskSort === 'due'} onPress={() => setTaskSort('due')} />
              <SegmentButton label="Priority" selected={taskSort === 'priority'} onPress={() => setTaskSort('priority')} />
            </View>
            {visibleTasks.length === 0 ? (
              <EmptyState text={data.tasks.length === 0 ? 'No tasks yet.' : 'No tasks match this view.'} />
            ) : visibleTasks.map(task => renderTaskRow(task, filter === 'all' && taskSort === 'manual'))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


function SummaryCard({
  title,
  value,
  detail,
  action,
  disabled = false,
  onPress,
}: {
  title: string;
  value: string;
  detail: string;
  action: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.summaryCard, disabled && styles.disabledCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
      <Pressable
        accessibilityLabel={`${action} ${title}`}
        accessibilityRole="button"
        disabled={disabled}
        style={({pressed}) => [styles.cardAction, pressed && styles.pressed, disabled && styles.disabledAction]}
        onPress={onPress}>
        <Text style={styles.cardActionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({title}: {title: string}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyState({text}: {text: string}) {
  return <Text style={styles.emptyState}>{text}</Text>;
}

function PrimaryButton({label, onPress, disabled = false}: {label: string; onPress: () => void; disabled?: boolean}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={({pressed}) => [styles.primaryButton, pressed && styles.pressed, disabled && styles.disabledAction]}
      onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={({pressed}) => [styles.textButton, pressed && styles.pressed, disabled && styles.disabledAction]}
      onPress={onPress}>
      <Text style={[styles.textButtonText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

function SegmentButton({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
      onPress={onPress}>
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ChipButton({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({label, icon, selected, onPress}: {label: string; icon: string; selected: boolean; onPress: () => void}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{selected}}
      style={styles.tab}
      onPress={onPress}>
      <Text style={[styles.tabIcon, selected && styles.tabSelected]}>{icon}</Text>
      <Text style={[styles.tabLabel, selected && styles.tabSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  header: {alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12},
  brand: {color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5},
  subtitle: {color: colors.muted, fontSize: 13, marginTop: 3},
  version: {color: colors.muted, fontSize: 11, marginBottom: 2},
  content: {flex: 1},
  scrollContent: {padding: 20, paddingBottom: 36},
  pageTitle: {color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6},
  pageIntro: {color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 18},
  editBanner: {alignItems: 'center', backgroundColor: colors.cardRaised, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 14, paddingVertical: 9},
  editBannerText: {color: colors.warning, fontSize: 14, fontWeight: '800'},
  cardGrid: {gap: 12},
  summaryCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16},
  disabledCard: {opacity: 0.72},
  cardTitle: {color: colors.muted, fontSize: 14, fontWeight: '700', textTransform: 'uppercase'},
  cardValue: {color: colors.text, fontSize: 23, fontWeight: '800', marginTop: 9},
  cardDetail: {color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 5, minHeight: 40},
  recoveryKey: {backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15, letterSpacing: 1.2, lineHeight: 25, marginTop: 12, padding: 13},
  cardAction: {alignSelf: 'flex-start', marginTop: 12},
  disabledAction: {opacity: 0.6},
  cardActionText: {color: colors.accent, fontSize: 14, fontWeight: '800'},
  backButton: {alignSelf: 'flex-start', marginBottom: 12},
  backButtonText: {color: colors.accent, fontSize: 15, fontWeight: '800'},
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10},
  emptyState: {backgroundColor: colors.card, borderRadius: 12, color: colors.muted, fontSize: 15, lineHeight: 22, padding: 16},
  listRow: {alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 66, paddingHorizontal: 14},
  listBody: {flex: 1},
  listTitle: {color: colors.text, fontSize: 16, fontWeight: '700'},
  listMeta: {color: colors.muted, fontSize: 13, marginTop: 5},
  chevron: {color: colors.muted, fontSize: 28, marginLeft: 12},
  formCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16},
  searchAccessNote: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10},
  searchResultRow: {backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, padding: 14},
  searchResultKind: {color: colors.accent, fontSize: 12, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase'},
  importPreview: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: 14, padding: 12},
  linkSection: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: 10, paddingTop: 4},
  linkRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  linkEditor: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: 12, padding: 12},
  splitLineCard: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: 14, padding: 12},
  formLabel: {color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 7},
  noteMarkupToolbar: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  segmentRow: {flexDirection: 'row', gap: 8},
  segmentButton: {borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 11},
  segmentButtonSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  segmentText: {color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center'},
  segmentTextSelected: {color: colors.accentText},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {borderColor: colors.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9},
  chipSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  chipText: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  chipTextSelected: {color: colors.accentText},
  input: {backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 13, paddingVertical: 10},
  quietHoursInput: {flex: 1, minWidth: 0},
  smallInput: {flex: 0, width: 62},
  multilineInput: {minHeight: 82, textAlignVertical: 'top'},
  primaryButton: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 10, marginTop: 16, paddingVertical: 13},
  primaryButtonText: {color: colors.accentText, fontSize: 15, fontWeight: '800'},
  textButton: {alignSelf: 'flex-start', marginTop: 12, paddingVertical: 5},
  textButtonText: {color: colors.accent, fontSize: 14, fontWeight: '800'},
  pressed: {opacity: 0.72},
  errorText: {color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10},
  warningText: {color: colors.warning, fontSize: 13, lineHeight: 19, marginTop: 10},
  successText: {color: colors.accent, fontSize: 14, lineHeight: 20, marginTop: 12},
  amount: {fontSize: 15, fontWeight: '800', marginLeft: 12},
  incomeText: {color: colors.accent},
  expenseText: {color: colors.warning},
  noteCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 15},
  savedSearchRow: {borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 10, paddingTop: 10},
  noteActions: {borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', marginTop: 10},
  attachmentSection: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: 14, paddingTop: 4},
  attachmentRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 4},
  attachmentName: {color: colors.text, fontSize: 14, fontWeight: '700'},
  manageRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8},
  rowActions: {alignItems: 'flex-end', marginLeft: 10},
  noteBody: {color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8},
  noteHeading: {color: colors.text, fontSize: 15, fontWeight: '800'},
  noteBulletMarker: {color: colors.accent, fontWeight: '800'},
  noteMarkupBold: {fontWeight: '800'},
  noteMarkupItalic: {fontStyle: 'italic'},
  noteMarkupCode: {backgroundColor: colors.cardRaised, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  taskRow: {alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 66, paddingHorizontal: 14},
  taskToggle: {alignItems: 'center', flex: 1, flexDirection: 'row', paddingVertical: 12},
  taskActions: {alignItems: 'center', flexDirection: 'row'},
  taskListRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 10},
  taskListActions: {alignItems: 'center', flexDirection: 'row'},
  checkbox: {alignItems: 'center', borderColor: colors.muted, borderRadius: 6, borderWidth: 1, height: 23, justifyContent: 'center', marginRight: 12, width: 23},
  checkboxDone: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkmark: {color: colors.accentText, fontSize: 16, fontWeight: '800'},
  completedText: {color: colors.muted, textDecorationLine: 'line-through'},
  tabBar: {backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 8, paddingTop: 8},
  tab: {alignItems: 'center', flex: 1, paddingVertical: 3},
  tabIcon: {color: colors.muted, fontSize: 20, height: 25},
  tabLabel: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2},
  tabSelected: {color: colors.accent},
  loading: {backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 28},
  loadingMessage: {color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12},
  dangerText: {color: colors.danger},
});
