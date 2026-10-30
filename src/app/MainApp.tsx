import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ComponentProps, ReactNode} from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Alert,
  Share,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Appbar, BottomNavigation, Button, Checkbox, Chip, FAB, Icon, IconButton, List, Menu, Searchbar, Surface, TextInput as PaperTextInput, TouchableRipple} from 'react-native-paper';
import {useAppStore} from '../data/AppStore';
import {formatDate, formatDateTime, formatLocalDate, formatLocalDateTime, formatMoney, sumMoney} from '../shared/format';
import {formatDuration} from '../shared/duration';
import {formatPeriodRange, getLocalDateKeys, getPeriodRange, isInPeriod, localDateKey, periodLabel} from '../shared/period';
import type {Period} from '../shared/period';
import {buildBudgetProjection, validateMoneyBudget, type MoneyBudgetInput} from '../shared/moneyBudget';
import {buildMoneyReport, emptyMoneyReportFilter, type MoneyReportFilter} from '../shared/moneyReport';
import {buildMoneyChartData, type MoneyChartData} from '../shared/moneyChart';
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
import {sharedCaptureTitle, type SharedCapture} from '../shared/shareCapture';
import {QUICK_CAPTURE_OPTIONS} from '../shared/quickCapture';
import {formatTaskReminderLocalDateTime, parseTaskReminderLocalDateTime, validateTaskReminderDraft} from '../shared/taskReminder';
import {DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES, TASK_REMINDER_SNOOZE_DURATION_OPTIONS} from '../shared/notificationSettings';
import {createId} from '../shared/id';
import {usageAccess} from '../platform/usageAccess';
import {dateTimePicker} from '../platform/dateTimePicker';
import {taskReminders} from '../platform/taskReminders';
import {shareCapture} from '../platform/shareCapture';
import {launchActions} from '../platform/launchActions';
import {deepLinks} from '../platform/deepLinks';
import {calendarDrafts} from '../platform/calendarDrafts';
import type {TaskReminderTarget} from '../platform/taskReminders';
import type {LaunchAction} from '../shared/launchAction';
import type {DeepLinkTarget} from '../shared/deepLink';
import {validateCalendarTaskDraft} from '../shared/calendarDraft';
import type {AppData, Attachment, BudgetPeriod, BudgetRollover, MissedOccurrencePolicy, MoneyEntry, MoneyKind, MoneyTransfer, Note, NoteLink, NoteLinkTargetType, RecurrenceCadence, RecurrenceWeekday, SavedSearch, Task, TaskPriority, TaskProject, TaskReminderSnoozeDurationMinutes, TaskTemplate, WeekStartDay} from '../types/domain';
import {deriveUsageMetrics, type UsageMetric} from '../shared/usageMetrics';
import {getMoneyRange, type MoneyCustomInterval, type MoneyRangePeriod} from '../shared/moneyRange';
import {nativeBundleInstaller, type UpdateCheckResult} from '../installer/BundleInstaller';
import {THEME_PALETTE_OPTIONS, THEME_PALETTES, useAppTheme, type ThemeColors} from './theme';
import {UI_TOKENS} from './uiTokens';
import {useAndroidBack, confirmDiscard} from './useAndroidBack';
import {actionIcon} from './actionIcon';
import {ChoiceMenu, DeferredSection, PERIOD_CHOICES} from './ProgressiveControls';

type Tab = 'home' | 'money' | 'notes' | 'tasks' | 'appTime';
type PrimaryTab = Exclude<Tab, 'appTime'>;
const PRIMARY_TAB_ROUTES: Array<{key: PrimaryTab; title: string; focusedIcon: string; unfocusedIcon: string; accessibilityLabel: string}> = [
  {key: 'home', title: 'Home', focusedIcon: 'home', unfocusedIcon: 'home-outline', accessibilityLabel: 'Home'},
  {key: 'money', title: 'Money', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline', accessibilityLabel: 'Money'},
  {key: 'notes', title: 'Notes', focusedIcon: 'note-text', unfocusedIcon: 'note-text-outline', accessibilityLabel: 'Notes'},
  {key: 'tasks', title: 'Tasks', focusedIcon: 'check-circle', unfocusedIcon: 'check-circle-outline', accessibilityLabel: 'Tasks'},
];
export const BOTTOM_NAV_SAFE_AREA_INSETS = {bottom: 0} as const;
export function shouldShowBottomNavigation(tab: Tab, secondaryScreenOpen: boolean): boolean {
  return !secondaryScreenOpen && tab !== 'appTime';
}
type MoneyView = 'entry' | 'budget' | 'split' | 'transfer' | 'report' | 'recurrence' | 'balances';
export function isMoneySecondaryView(view: MoneyView): boolean {
  return view !== 'entry';
}
export function moneyRangePeriodLabel(period: MoneyRangePeriod): string {
  return period === 'day' ? 'Day' : period === 'week' ? 'Week' : period === 'month' ? 'Month' : period === 'year' ? 'Year' : 'Custom';
}
type QuickCaptureTab = 'money' | 'notes' | 'tasks';

const ALL_RECURRENCE_WEEKDAYS: RecurrenceWeekday[] = [0, 1, 2, 3, 4, 5, 6];
const RECURRENCE_WEEKDAY_OPTIONS: Array<{value: RecurrenceWeekday; label: string}> = [
  {value: 1, label: 'Mon'},
  {value: 2, label: 'Tue'},
  {value: 3, label: 'Wed'},
  {value: 4, label: 'Thu'},
  {value: 5, label: 'Fri'},
  {value: 6, label: 'Sat'},
  {value: 0, label: 'Sun'},
];

function formatCodeUpdateError(reasonCode: string): string {
  switch (reasonCode) {
    case 'REMOTE_UNAVAILABLE':
      return 'The update service could not be reached. Your current code is unchanged.';
    case 'BLOCKED_VERSION':
      return 'This release was rejected after a failed startup. Wait for a newer release.';
    case 'INVALID_REMOTE':
      return 'The update was rejected because its metadata or signature was invalid.';
    case 'NATIVE_UPDATE_REQUIRED':
      return 'This update needs a newer Android app. Yuzuha will use the verified APK update flow.';
    case 'BRIDGE_CHECK_FAILED':
      return 'The update check could not be completed.';
    case 'BRIDGE_DOWNLOAD_FAILED':
      return 'The update could not be prepared. Your current code is unchanged.';
    default:
      return 'The update could not be prepared. Your current code is unchanged.';
  }
}

function formatRecurrenceWeekdays(weekdays: RecurrenceWeekday[]): string {
  return RECURRENCE_WEEKDAY_OPTIONS.filter(day => weekdays.includes(day.value)).map(day => day.label).join(' ');
}

export function formatActiveAccountCount(count: number): string {
  return `${count} active ${count === 1 ? 'account' : 'accounts'}`;
}

function useThemeStyles() {
  const {colors, mode, palette, resolvedMode, setMode, setPalette} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return {colors, styles, mode, palette, resolvedMode, setMode, setPalette};
}

export function MainApp({bundleVersion = '0.2.1'}: {bundleVersion?: string}) {
  const {colors, styles, resolvedMode} = useThemeStyles();
  const {data, isLoading, error, addNote, addNoteWithAttachment, addTask, completeTaskFromReminder, snoozeTaskFromReminder} = useAppStore();
  const [tab, setTab] = useState<Tab>('home');
  const [pendingAddTab, setPendingAddTab] = useState<QuickCaptureTab | null>(null);
  const [dataToolsOpen, setDataToolsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sharedCapture, setSharedCapture] = useState<SharedCapture | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [pendingMoneyId, setPendingMoneyId] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingListId, setPendingListId] = useState<string | null>(null);
  const [pendingAppGroupId, setPendingAppGroupId] = useState<string | null>(null);
  const [pendingBudgetId, setPendingBudgetId] = useState<string | null>(null);
  const [pendingReminderAction, setPendingReminderAction] = useState<TaskReminderTarget | null>(null);
  const lastSharedCaptureKey = useRef<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAppearanceOpen, setSettingsAppearanceOpen] = useState(false);
  const [settingsAppTimeOpen, setSettingsAppTimeOpen] = useState(false);
  const [settingsTasksOpen, setSettingsTasksOpen] = useState(false);
  const [tabSecondaryScreenOpen, setTabSecondaryScreenOpen] = useState(false);
  useAndroidBack(Boolean(sharedCapture || dataToolsOpen || globalSearchOpen || reviewOpen || tab === 'appTime'), 5, () => {
    if (sharedCapture) confirmDiscard(() => closeSharedCapture());
    else if (dataToolsOpen) setDataToolsOpen(false);
    else if (globalSearchOpen) setGlobalSearchOpen(false);
    else if (reviewOpen) setReviewOpen(false);
    else setTab('home');
  });

  const openQuickCapture = useCallback((target: QuickCaptureTab) => {
    setPendingAddTab(target);
    setTab(target);
  }, []);

  const openGlobalSearchResult = useCallback((navigation: GlobalSearchNavigation) => {
    setPendingTaskId(navigation.focusTaskId);
    setPendingNoteId(navigation.focusNoteId);
    setPendingMoneyId(navigation.focusMoneyId);
    setPendingProjectId(navigation.focusProjectId);
    setPendingTemplateId(navigation.focusTemplateId);
    setPendingListId(navigation.focusListId);
    setPendingAppGroupId(navigation.focusAppGroupId);
    setPendingBudgetId(navigation.focusBudgetId);
    setGlobalSearchOpen(false);
    if (navigation.focusAppGroupId) {
      setSettingsAppTimeOpen(true);
      setSettingsOpen(true);
      return;
    }
    if (navigation.focusProjectId || navigation.focusTemplateId || navigation.focusListId) {
      setSettingsTasksOpen(true);
      setSettingsOpen(true);
      return;
    }
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
    setSettingsOpen(false);
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
    setSettingsOpen(false);
    setSettingsAppearanceOpen(false);
    setSettingsAppTimeOpen(false);
    setSettingsTasksOpen(false);
    if (action === 'settingsAppearance') {
      setSettingsOpen(true);
      setSettingsAppearanceOpen(true);
      setPendingAddTab(null);
      return;
    }
    setPendingAddTab(action === 'appTime' ? null : action);
    setTab(action);
  }, []);

  const openDeepLink = useCallback((target: DeepLinkTarget) => {
    lastSharedCaptureKey.current = null;
    setSharedCapture(null);
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setSettingsOpen(false);
    setTab(target);
  }, []);

  const openReminderTask = useCallback((taskId: string) => {
    setPendingTaskId(taskId);
    setDataToolsOpen(false);
    setGlobalSearchOpen(false);
    setReviewOpen(false);
    setSettingsOpen(false);
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
      <StatusBar backgroundColor={colors.background} barStyle={resolvedMode === 'dark' ? 'light-content' : 'dark-content'} />
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
        ) : settingsOpen ? (
          <SettingsScreen bundleVersion={bundleVersion} initiallyOpenAppearance={settingsAppearanceOpen} initiallyOpenAppTime={settingsAppTimeOpen} initiallyOpenTasks={settingsTasksOpen} focusAppGroupId={pendingAppGroupId} focusProjectId={pendingProjectId} focusTemplateId={pendingTemplateId} focusListId={pendingListId} onAppGroupFocusHandled={() => setPendingAppGroupId(null)} onProjectFocusHandled={() => setPendingProjectId(null)} onTemplateFocusHandled={() => setPendingTemplateId(null)} onListFocusHandled={() => setPendingListId(null)} onBack={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(false);}} />
        ) : globalSearchOpen ? (
          <GlobalSearchScreen data={data} onBack={() => setGlobalSearchOpen(false)} onNavigate={openGlobalSearchResult} />
        ) : reviewOpen ? (
          <ReviewScreen data={data} onBack={() => setReviewOpen(false)} onNavigate={setTab} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen data={data} onNavigate={nextTab => {setPendingAddTab(null); setTab(nextTab);}} onQuickCapture={openQuickCapture} onOpenDataTools={() => setDataToolsOpen(true)} onOpenSearch={() => setGlobalSearchOpen(true)} onOpenReview={() => setReviewOpen(true)} onOpenSettings={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(true);}} />}
            {tab === 'money' && <MoneyScreen focusMoneyId={pendingMoneyId} focusBudgetId={pendingBudgetId} openAdd={pendingAddTab === 'money'} onAddHandled={() => setPendingAddTab(null)} onFocusHandled={() => setPendingMoneyId(null)} onBudgetFocusHandled={() => setPendingBudgetId(null)} onSecondaryScreenChange={setTabSecondaryScreenOpen} onOpenSettings={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(true);}} />}
            {tab === 'notes' && <NotesScreen focusNoteId={pendingNoteId} openAdd={pendingAddTab === 'notes'} onAddHandled={() => setPendingAddTab(null)} onFocusHandled={() => setPendingNoteId(null)} onSecondaryScreenChange={setTabSecondaryScreenOpen} onOpenSettings={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(true);}} />}
            {tab === 'tasks' && <TasksScreen focusTaskId={pendingTaskId} focusProjectId={pendingProjectId} focusTemplateId={pendingTemplateId} focusListId={pendingListId} openAdd={pendingAddTab === 'tasks'} onAddHandled={() => setPendingAddTab(null)} onTaskFocusHandled={() => setPendingTaskId(null)} onProjectFocusHandled={() => setPendingProjectId(null)} onTemplateFocusHandled={() => setPendingTemplateId(null)} onListFocusHandled={() => setPendingListId(null)} onSecondaryScreenChange={setTabSecondaryScreenOpen} onOpenSettings={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(true);}} />}
            {tab === 'appTime' && <AppTimeScreen onBack={() => setTab('home')} onOpenSettings={() => {setSettingsAppearanceOpen(false); setSettingsAppTimeOpen(false); setSettingsTasksOpen(false); setSettingsOpen(true);}} />}
          </>
        )}
      </View>

      {shouldShowBottomNavigation(tab, Boolean(sharedCapture || dataToolsOpen || settingsOpen || globalSearchOpen || reviewOpen || tabSecondaryScreenOpen)) && <BottomNavigation.Bar
        navigationState={{
          index: Math.max(0, PRIMARY_TAB_ROUTES.findIndex(route => route.key === tab)),
          routes: PRIMARY_TAB_ROUTES,
        }}
        shifting={false}
        labeled
        activeColor={colors.accent}
        inactiveColor={colors.muted}
        safeAreaInsets={BOTTOM_NAV_SAFE_AREA_INSETS}
        style={styles.tabBar}
        onTabPress={({route}) => {setTabSecondaryScreenOpen(false); setTab(route.key);}}
      />}
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
  const {styles} = useThemeStyles();
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
      <SecondaryHeader title="Shared capture" backLabel="Yuzuha" onBack={onDismiss} />
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
  const {styles} = useThemeStyles();
  return (
    <SafeAreaView style={styles.loading}>
      <Text style={[styles.loadingMessage, tone === 'danger' && styles.dangerText]}>{message}</Text>
    </SafeAreaView>
  );
}

export function HomeScreen({
  data,
  onNavigate,
  onQuickCapture,
  onOpenDataTools,
  onOpenSearch,
  onOpenReview,
  onOpenSettings,
}: {
  data: AppData;
  onNavigate: (tab: Tab) => void;
  onQuickCapture: (target: QuickCaptureTab) => void;
  onOpenDataTools: () => void;
  onOpenSearch: () => void;
  onOpenReview: () => void;
  onOpenSettings: () => void;
}) {
  const {styles} = useThemeStyles();
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  useAndroidBack(quickCaptureOpen, 100, () => setQuickCaptureOpen(false));
  const [homePeriod, setHomePeriod] = useState<Period>('day');
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
  const activeMainAccounts = data.accounts.filter(account => !account.isArchived && account.currency === data.mainCurrency);
  const totalBalanceMinor = activeMainAccounts.reduce(
    (total, account) => total + calculateAccountBalance(account, data.money, data.transfers),
    0,
  );
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.fabScrollContent]}>
      <TabHeader
        title="Overview"
        subtitle={formatPeriodRange(range)}
        actions={[
          {label: 'Search', icon: 'magnify', onPress: onOpenSearch},
          {label: 'Review', icon: 'clipboard-text-clock-outline', onPress: onOpenReview},
          {label: 'Data tools', icon: 'database-outline', onPress: onOpenDataTools},
        ]}
        onOpenSettings={onOpenSettings}
      />
      <ChoiceMenu label="Period" value={homePeriod} options={PERIOD_CHOICES} onSelect={setHomePeriod} />

      <TouchableRipple
        accessibilityLabel="Open money"
        accessibilityRole="button"
        style={[styles.homeMoneyWidget, styles.cardShadow]}
        onPress={() => onNavigate('money')}>
        <View>
          <Text style={styles.homeBalanceLabel}>Money</Text>
          <Text style={styles.homeBalanceValue}>{formatMoney(totalBalanceMinor, data.mainCurrency)}</Text>
          {periodMoney.length > 0 && <Text style={styles.homeBalanceDetail}>
            {formatMoney(expenses, data.mainCurrency)} spent · {formatMoney(income, data.mainCurrency)} income
          </Text>}
          <Text style={styles.homeWidgetAction}>Open money</Text>
        </View>
      </TouchableRipple>

      <View style={styles.cardGrid}>
        <SummaryCard
          title="App time"
          value={hasUsagePermission ? formatDuration(appTimeSeconds) : 'Not connected'}
          detail={hasUsagePermission ? `${selectedPeriodLabel} from Android Usage Access.` : undefined}
          action={hasUsagePermission ? 'Open app time' : 'Set up access'}
          onPress={() => onNavigate('appTime')}
        />
        <SummaryCard
          title="Tasks"
          value={`${openTasks} open`}
          detail={openTasks === 0 ? undefined : `${dueTasks} due ${selectedPeriodLabel.toLowerCase()}.`}
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

      {recentNotes.length > 0 && (
        <>
        <SectionTitle title="Recent notes" />
        {recentNotes.map(note => (
          <View key={note.id} style={styles.listRow}>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{note.title}</Text>
              <Text style={styles.listMeta}>{formatDate(note.updatedAt)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
        </>
      )}
      </ScrollView>
      <View pointerEvents="box-none" style={styles.fabLayer}>
        {quickCaptureOpen && (
          <View style={styles.quickCaptureMenu} accessibilityViewIsModal>
            <Text style={styles.quickCaptureMenuTitle}>Add</Text>
            {QUICK_CAPTURE_OPTIONS.map(option => (
              <TouchableRipple
                key={option.target}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={styles.quickCaptureOption}
                onPress={() => {
                  setQuickCaptureOpen(false);
                  onQuickCapture(option.target);
                }}>
                <View style={styles.quickCaptureOptionContent}><Icon source={actionIcon(option.label) ?? 'plus'} size={20} /><Text style={styles.quickCaptureOptionText}>{option.label}</Text></View>
              </TouchableRipple>
            ))}
          </View>
        )}
        <FloatingActionButton
          label={quickCaptureOpen ? 'Close add menu' : 'Open add menu'}
          onPress={() => setQuickCaptureOpen(current => !current)}
          isOpen={quickCaptureOpen}
        />
      </View>
    </View>
  );
}

function ReviewScreen({data, onBack, onNavigate}: {data: AppData; onBack: () => void; onNavigate: (tab: Tab) => void}) {
  const {styles} = useThemeStyles();
  const [reviewPeriod, setReviewPeriod] = useState<Period>('day');
  const range = getPeriodRange(new Date(), reviewPeriod, data.weekStartsOn);
  const summary = buildReviewSummary(data, range);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SecondaryHeader title="Review" backLabel="Home" onBack={onBack} />
      <Text style={styles.pageIntro}>{formatPeriodRange(range)}</Text>
      <ChoiceMenu label="Period" value={reviewPeriod} options={PERIOD_CHOICES} onSelect={setReviewPeriod} />

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
  const {colors, styles} = useThemeStyles();
  const [query, setQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const results = searchGlobal(data, query, {includeArchived});

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SecondaryHeader title="Search" backLabel="Home" onBack={onBack} />
        <AppTextInput
          accessibilityLabel="Global search"
          placeholder="Search"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        <ToggleButton label="Include archived records" value={includeArchived} onPress={() => setIncludeArchived(current => !current)} />
        {!query.trim() ? (
          <EmptyState text="Enter a search term." />
        ) : results.length === 0 ? (
          <EmptyState text="No matches in the selected records." />
        ) : (
          <View>
            <SectionTitle title={`${results.length} result${results.length === 1 ? '' : 's'}`} />
            {results.map(result => (
              <TouchableRipple
                key={`${result.kind}:${result.id}`}
                accessibilityLabel={`Open ${globalSearchKindLabel(result.kind)} ${result.title}`}
                accessibilityRole="button"
                style={styles.searchResultRow}
                onPress={() => {
                  onNavigate(globalSearchNavigation(result));
                  onBack();
                }}>
                <View>
                  <Text style={styles.searchResultKind}>{globalSearchKindLabel(result.kind)}</Text>
                  <Text style={styles.listTitle}>{result.title}</Text>
                  <Text style={styles.listMeta}>{result.detail}{result.isArchived ? ' · archived' : ''}</Text>
                </View>
              </TouchableRipple>
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

type SettingsSection = 'appearance' | 'general' | 'money' | 'tasks' | 'appTime' | 'taskReminders' | 'codeUpdates';

const SETTINGS_SECTION_TITLES: Record<SettingsSection, string> = {
  appearance: 'Appearance',
  general: 'General',
  money: 'Money',
  tasks: 'Task organization',
  appTime: 'App time',
  taskReminders: 'Task reminders',
  codeUpdates: 'Code updates',
};

export function SettingsScreen({bundleVersion, onBack, initiallyOpenAppearance = false, initiallyOpenAppTime = false, initiallyOpenTasks = false, focusAppGroupId = null, focusProjectId = null, focusTemplateId = null, focusListId = null, onAppGroupFocusHandled = () => {}, onProjectFocusHandled = () => {}, onTemplateFocusHandled = () => {}, onListFocusHandled = () => {}}: {bundleVersion: string; onBack: () => void; initiallyOpenAppearance?: boolean; initiallyOpenAppTime?: boolean; initiallyOpenTasks?: boolean; focusAppGroupId?: string | null; focusProjectId?: string | null; focusTemplateId?: string | null; focusListId?: string | null; onAppGroupFocusHandled?: () => void; onProjectFocusHandled?: () => void; onTemplateFocusHandled?: () => void; onListFocusHandled?: () => void}) {
  const {styles} = useThemeStyles();
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(initiallyOpenAppearance ? 'appearance' : initiallyOpenAppTime ? 'appTime' : initiallyOpenTasks ? 'tasks' : null);

  useAndroidBack(true, 20, () => activeSection ? setActiveSection(null) : onBack());

  if (activeSection === 'tasks') {
    return (
      <TasksScreen
        configurationOnly
        focusTaskId={null}
        focusProjectId={focusProjectId}
        focusTemplateId={focusTemplateId}
        focusListId={focusListId}
        openAdd={false}
        onAddHandled={() => {}}
        onTaskFocusHandled={() => {}}
        onProjectFocusHandled={onProjectFocusHandled}
        onTemplateFocusHandled={onTemplateFocusHandled}
        onListFocusHandled={onListFocusHandled}
        onOpenSettings={() => {}}
        onConfigurationBack={() => setActiveSection(null)}
      />
    );
  }

  if (activeSection) {
    return (
      <View style={styles.flex}>
        <Appbar.Header mode="small" statusBarHeight={0} style={styles.settingsAppbar}>
          <Appbar.BackAction accessibilityLabel="Back to Settings" onPress={() => setActiveSection(null)} />
          <Appbar.Content title={SETTINGS_SECTION_TITLES[activeSection]} titleStyle={styles.settingsAppbarTitle} />
        </Appbar.Header>
        <ScrollView contentContainerStyle={styles.settingsDetailContent}>
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'money' && <MoneySettings />}
          {(activeSection === 'general' || activeSection === 'appTime' || activeSection === 'taskReminders') && <WorkspacePreferences section={activeSection} focusAppGroupId={focusAppGroupId} onAppGroupFocusHandled={onAppGroupFocusHandled} />}
          {activeSection === 'codeUpdates' && <CodeUpdatesContent bundleVersion={bundleVersion} />}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Appbar.Header mode="small" statusBarHeight={0} style={styles.settingsAppbar}>
        <Appbar.BackAction accessibilityLabel="Back to previous tab" onPress={onBack} />
        <Appbar.Content title="Settings" titleStyle={styles.settingsAppbarTitle} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.settingsDetailContent}>
        <SettingsNavigation bundleVersion={bundleVersion} onOpen={setActiveSection} />
      </ScrollView>
    </View>
  );
}

function SettingsNavigation({bundleVersion, onOpen}: {bundleVersion: string; onOpen: (section: SettingsSection) => void}) {
  const {colors, styles, mode, palette, resolvedMode} = useThemeStyles();
  const data = useAppStore()?.data;
  const rows: Array<{section: SettingsSection; subtitle: string; icon: string}> = [
    {section: 'appearance', subtitle: `${THEME_PALETTES[palette].label} · ${mode === 'system' ? `System (${resolvedMode})` : mode}`, icon: 'palette-outline'},
    {section: 'general', subtitle: data ? `Week starts on ${data.weekStartsOn === 0 ? 'Sunday' : 'Monday'}` : 'Date and calendar preferences', icon: 'tune-variant'},
    {section: 'money', subtitle: data ? `${data.accounts.filter(item => !item.isArchived).length} ${data.accounts.filter(item => !item.isArchived).length === 1 ? 'account' : 'accounts'} · ${data.categories.filter(item => !item.isArchived).length} categories` : 'Accounts, categories, and payees', icon: 'wallet-outline'},
    {section: 'tasks', subtitle: data ? `${data.projects.length} ${data.projects.length === 1 ? 'project' : 'projects'} · ${data.taskLists.length} ${data.taskLists.length === 1 ? 'list' : 'lists'}` : 'Projects, templates, lists, and rules', icon: 'format-list-checks'},
    {section: 'appTime', subtitle: data ? `${data.usageExcludedPackages.length} excluded apps` : 'App inclusion and Usage Access', icon: 'chart-timeline-variant'},
    {section: 'taskReminders', subtitle: data?.notificationSettings.taskRemindersEnabled ? 'Task reminders on' : 'Task reminders off', icon: 'bell-outline'},
    {section: 'codeUpdates', subtitle: `Running bundle ${bundleVersion}`, icon: 'update'},
  ];

  return (
    <Surface style={styles.settingsList} elevation={0}>
      <View style={styles.settingsListContent}>
        {rows.map((row, index) => (
          <List.Item
          key={row.section}
          accessibilityLabel={`Open ${SETTINGS_SECTION_TITLES[row.section]} settings`}
          accessibilityRole="button"
          title={SETTINGS_SECTION_TITLES[row.section]}
          description={row.subtitle}
          titleStyle={styles.settingsNavigationTitle}
          descriptionStyle={styles.settingsNavigationDescription}
          style={[styles.settingsNavigationRow, index === rows.length - 1 && styles.settingsNavigationRowLast]}
          left={props => <List.Icon {...props} icon={row.icon} color={colors.muted} />}
          right={props => <List.Icon {...props} icon="chevron-right" color={colors.muted} />}
          onPress={() => onOpen(row.section)}
          />
        ))}
      </View>
    </Surface>
  );
}

function MoneySettings() {
  const {colors, styles} = useThemeStyles();
  const {data, addMoneyAccount, addMoneyCategory, addMoneyPayee, archiveMoneyAccount, archiveMoneyCategory, archiveMoneyPayee} = useAppStore();
  const [kind, setKind] = useState<MoneyKind>('expense');
  const [newAccount, setNewAccount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPayee, setNewPayee] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  const currentData = data;

  async function addAccount() {
    if (!newAccount.trim()) return;
    try {
      await addMoneyAccount(newAccount.trim(), currentData.mainCurrency);
      setNewAccount('');
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The account could not be added.');
    }
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    try {
      await addMoneyCategory(newCategory.trim(), kind);
      setNewCategory('');
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The category could not be added.');
    }
  }

  async function addPayee() {
    if (!newPayee.trim()) return;
    try {
      await addMoneyPayee(newPayee.trim());
      setNewPayee('');
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The payee could not be added.');
    }
  }

  return (
    <View style={styles.settingsStack}>
      <Surface style={styles.formCard} elevation={0}>
        <Text style={styles.cardTitle}>Accounts</Text>
        <DeferredSection title="Add account">
        <AppTextInput accessibilityLabel="New account name" placeholder="Account name" placeholderTextColor={colors.muted} style={styles.input} value={newAccount} onChangeText={setNewAccount} />
        <PrimaryButton label="Add account" onPress={() => void addAccount()} />
        </DeferredSection>
        {currentData.accounts.filter(account => !account.isArchived).map(account => (
          <View key={account.id} style={styles.manageRow}>
            <View style={styles.listBody}><Text style={styles.listTitle}>{account.name}</Text><Text style={styles.listMeta}>{account.currency}</Text></View>
            <TextButton label="Archive" disabled={currentData.accounts.filter(item => !item.isArchived).length <= 1} onPress={() => void archiveMoneyAccount(account.id)} />
          </View>
        ))}
      </Surface>
      <Surface style={styles.formCard} elevation={0}>
        <Text style={styles.cardTitle}>Categories</Text>
        <DeferredSection title="Add category">
        <View style={styles.segmentRow}>
          <SegmentButton label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} />
          <SegmentButton label="Income" selected={kind === 'income'} onPress={() => setKind('income')} />
        </View>
        <AppTextInput accessibilityLabel="New category name" placeholder="Category name" placeholderTextColor={colors.muted} style={styles.input} value={newCategory} onChangeText={setNewCategory} />
        <PrimaryButton label="Add category" onPress={() => void addCategory()} />
        </DeferredSection>
        {currentData.categories.filter(category => !category.isArchived).map(category => (
          <View key={category.id} style={styles.manageRow}>
            <View style={styles.listBody}><Text style={styles.listTitle}>{category.name}</Text><Text style={styles.listMeta}>{category.kind}</Text></View>
            <TextButton label="Archive" onPress={() => void archiveMoneyCategory(category.id)} />
          </View>
        ))}
      </Surface>
      <Surface style={styles.formCard} elevation={0}>
        <Text style={styles.cardTitle}>Payees</Text>
        <DeferredSection title="Add payee">
        <AppTextInput accessibilityLabel="New payee name" placeholder="Payee name" placeholderTextColor={colors.muted} style={styles.input} value={newPayee} onChangeText={setNewPayee} />
        <PrimaryButton label="Add payee" onPress={() => void addPayee()} />
        </DeferredSection>
        {currentData.payees.filter(payee => !payee.isArchived).map(payee => (
          <View key={payee.id} style={styles.manageRow}>
            <Text style={styles.listTitle}>{payee.name}</Text>
            <TextButton label="Archive" onPress={() => void archiveMoneyPayee(payee.id)} />
          </View>
        ))}
      </Surface>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function AppGroupSettings({focusAppGroupId, onFocusHandled}: {focusAppGroupId: string | null; onFocusHandled: () => void}) {
  const {colors, styles} = useThemeStyles();
  const {data, addAppGroup, updateAppGroup, setAppGroupArchived, deleteAppGroup} = useAppStore();
  const [name, setName] = useState('');
  const [packages, setPackages] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusAppGroupId || !data) return;
    const group = data.appGroups.find(item => item.id === focusAppGroupId);
    if (group) {
      setEditingId(group.id);
      setName(group.name);
      setPackages(group.packageNames.join(', '));
    }
    onFocusHandled();
  }, [data, focusAppGroupId, onFocusHandled]);

  if (!data) return null;

  function reset() {
    setEditingId(null);
    setName('');
    setPackages('');
    setError(null);
  }

  async function save() {
    const draft = {name, packageNames: packages.split(',')};
    const validationError = validateAppGroupDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      if (editingId) await updateAppGroup(editingId, draft);
      else await addAppGroup(draft);
      reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The app group could not be saved.');
    }
  }

  function edit(group: AppData['appGroups'][number]) {
    setEditingId(group.id);
    setName(group.name);
    setPackages(group.packageNames.join(', '));
    setError(null);
  }

  function confirmDelete(group: AppData['appGroups'][number]) {
    Alert.alert('Delete app group?', `Delete "${group.name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void deleteAppGroup(group.id)},
    ]);
  }

  return (
    <Surface style={styles.formCard} elevation={0}>
      <Text style={styles.cardTitle}>App groups</Text>
      <DeferredSection title={editingId ? 'Edit app group' : 'Add app group'} revealKey={editingId}>
      <AppTextInput accessibilityLabel="App group name" placeholder="Group name" placeholderTextColor={colors.muted} style={styles.input} value={name} onChangeText={setName} />
      <AppTextInput accessibilityLabel="App group packages" placeholder="com.editor, com.browser" placeholderTextColor={colors.muted} style={styles.input} value={packages} onChangeText={setPackages} />
      <PrimaryButton label={editingId ? 'Update group' : 'Add group'} onPress={() => void save()} />
      {editingId && <TextButton label="Cancel edit" onPress={reset} />}
      </DeferredSection>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {data.appGroups.map(group => (
        <View key={group.id} style={styles.manageRow}>
          <View style={styles.listBody}><Text style={styles.listTitle}>{group.name}</Text><Text style={styles.listMeta}>{group.packageNames.join(', ') || 'No packages'}{group.isArchived ? ' · Archived' : ''}</Text></View>
          <MenuActions actions={[
            {label: 'Edit', onPress: () => edit(group)},
            {label: group.isArchived ? 'Restore' : 'Archive', onPress: () => void setAppGroupArchived(group.id, !group.isArchived)},
            {label: 'Delete', danger: true, onPress: () => confirmDelete(group)},
          ]} accessibilityLabel={`Manage ${group.name}`} />
        </View>
      ))}
    </Surface>
  );
}

function AppearanceSettings() {
  const {styles, mode, palette, setMode, setPalette} = useThemeStyles();
  return (
    <Surface style={styles.formCard} elevation={0}>
      <Text style={styles.cardDetail}>System follows Android. Device-only appearance choices reset on relaunch.</Text>
      <View style={styles.segmentRow}>
        <SegmentButton label="System" selected={mode === 'system'} onPress={() => setMode('system')} />
        <SegmentButton label="Light" selected={mode === 'light'} onPress={() => setMode('light')} />
        <SegmentButton label="Dark" selected={mode === 'dark'} onPress={() => setMode('dark')} />
      </View>
      <Text style={styles.formLabel}>Color palette</Text>
      <Text style={styles.cardDetail}>Pick an accent color. Each palette has matching light and dark values.</Text>
      <View style={styles.paletteGrid}>
        {THEME_PALETTE_OPTIONS.map(option => (
          <TouchableRipple
            key={option.value}
            accessibilityLabel={`Use ${option.label} color palette`}
            accessibilityRole="button"
            accessibilityState={{selected: palette === option.value}}
            style={[styles.paletteOption, palette === option.value && styles.paletteOptionSelected]}
            onPress={() => setPalette(option.value)}>
            <View style={styles.paletteOptionContent}>
              <View style={[styles.paletteSwatch, {backgroundColor: option.swatch}]} />
              <View style={styles.paletteOptionCopy}>
                <Text style={styles.paletteLabel}>{option.label}</Text>
                <Text style={styles.paletteDescription}>{option.description}</Text>
              </View>
            </View>
          </TouchableRipple>
        ))}
      </View>
    </Surface>
  );
}

function WorkspacePreferences({section, focusAppGroupId = null, onAppGroupFocusHandled = () => {}}: {section: 'general' | 'appTime' | 'taskReminders'; focusAppGroupId?: string | null; onAppGroupFocusHandled?: () => void}) {
  const {colors, styles} = useThemeStyles();
  const store = useAppStore();
  const data = store?.data;
  const [weekStartError, setWeekStartError] = useState<string | null>(null);
  const [quietHoursStartLocalTime, setQuietHoursStartLocalTime] = useState('');
  const [quietHoursEndLocalTime, setQuietHoursEndLocalTime] = useState('');
  const [snoozeDurationMinutes, setSnoozeDurationMinutes] = useState<TaskReminderSnoozeDurationMinutes>(DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES);
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  useAndroidBack(snoozeMenuOpen, 100, () => setSnoozeMenuOpen(false));
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(true);
  const [recurringTaskRemindersEnabled, setRecurringTaskRemindersEnabled] = useState(true);
  const [notificationSettingsError, setNotificationSettingsError] = useState<string | null>(null);
  const [notificationSettingsMessage, setNotificationSettingsMessage] = useState<string | null>(null);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  useEffect(() => {
    if (!data) return;
    setQuietHoursStartLocalTime(data.notificationSettings.quietHoursStartLocalTime ?? '');
    setQuietHoursEndLocalTime(data.notificationSettings.quietHoursEndLocalTime ?? '');
    setSnoozeDurationMinutes(data.notificationSettings.snoozeDurationMinutes);
    setTaskRemindersEnabled(data.notificationSettings.taskRemindersEnabled);
    setRecurringTaskRemindersEnabled(data.notificationSettings.recurringTaskRemindersEnabled);
  }, [data?.notificationSettings.quietHoursStartLocalTime, data?.notificationSettings.quietHoursEndLocalTime, data?.notificationSettings.snoozeDurationMinutes, data?.notificationSettings.taskRemindersEnabled, data?.notificationSettings.recurringTaskRemindersEnabled]);

  if (!store || !data) return null;

  const knownApps = Array.from(new Map(data.usageSnapshots.map(snapshot => [snapshot.packageName, snapshot.displayName])).entries())
    .sort((left, right) => left[1].localeCompare(right[1]) || left[0].localeCompare(right[0]));

  async function saveWeekStart(weekStartsOn: WeekStartDay) {
    setWeekStartError(null);
    try {
      await store.setWeekStartsOn(weekStartsOn);
    } catch (error) {
      setWeekStartError(error instanceof Error ? error.message : 'The week start could not be saved.');
    }
  }

  async function pickQuietHour(setter: (value: string) => void, current: string) {
    try {
      const selected = await dateTimePicker.pickTime(current || '22:00');
      if (selected) setter(selected);
    } catch (pickerError) {
      setNotificationSettingsError(pickerError instanceof Error ? pickerError.message : 'The quiet-hours picker failed.');
    }
  }

  async function saveNotificationSettings() {
    setSavingNotificationSettings(true);
    setNotificationSettingsError(null);
    setNotificationSettingsMessage(null);
    try {
      await store.setNotificationQuietHours(quietHoursStartLocalTime, quietHoursEndLocalTime, snoozeDurationMinutes, taskRemindersEnabled, recurringTaskRemindersEnabled);
      setNotificationSettingsMessage(taskRemindersEnabled ? (quietHoursStartLocalTime.trim() ? 'Notification settings saved.' : 'Notification settings saved; quiet hours disabled.') : 'Task reminders paused. Reminder times remain saved.');
    } catch (settingsError) {
      setNotificationSettingsError(settingsError instanceof Error ? settingsError.message : 'Notification settings could not be saved.');
    } finally {
      setSavingNotificationSettings(false);
    }
  }

  if (section === 'general') {
    return (
      <Surface style={styles.formCard} elevation={0}>
        <Text style={styles.formLabel}>Week starts on</Text>
        <View style={styles.segmentRow}>
          <SegmentButton label="Sunday" selected={data.weekStartsOn === 0} onPress={() => void saveWeekStart(0)} />
          <SegmentButton label="Monday" selected={data.weekStartsOn === 1} onPress={() => void saveWeekStart(1)} />
        </View>
        <Text style={styles.cardDetail}>This applies to Home, Review, Money, App Time, tasks, and budget projections.</Text>
        {weekStartError && <Text style={styles.errorText}>{weekStartError}</Text>}
      </Surface>
    );
  }

  if (section === 'appTime') {
    return (
      <View style={styles.settingsStack}>
        <Surface style={styles.formCard} elevation={0}>
          <Text style={styles.cardTitle}>Included apps</Text>
          {knownApps.length === 0 ? <EmptyState text="Refresh App Time once to see known apps." /> : knownApps.map(([packageName, displayName]) => {
            const excluded = data.usageExcludedPackages.includes(packageName);
            return (
              <View key={packageName} style={styles.manageRow}>
                <View style={styles.listBody}><Text style={styles.listTitle}>{displayName}</Text><Text style={styles.listMeta}>{packageName}</Text></View>
                <TextButton label={excluded ? 'Include' : 'Exclude'} onPress={() => void store.toggleUsageExclusion(packageName)} />
              </View>
            );
          })}
          {usageAccess.isSupported() && <TextButton label="Open Android Usage Access" onPress={() => void usageAccess.openSettings()} />}
        </Surface>
        <TimeGoalSettings />
        <AppGroupSettings focusAppGroupId={focusAppGroupId} onFocusHandled={onAppGroupFocusHandled} />
      </View>
    );
  }

  return (
      <Surface style={styles.formCard} elevation={0}>
        <ToggleButton label="Task reminders" value={taskRemindersEnabled} onPress={() => setTaskRemindersEnabled(current => !current)} />
        {!taskRemindersEnabled && <Text style={styles.cardDetail}>Reminder times stay saved; native alarms are paused.</Text>}
        <ToggleButton label="Recurring task reminders" value={recurringTaskRemindersEnabled} onPress={() => setRecurringTaskRemindersEnabled(current => !current)} />
        <DeferredSection title="Delivery options" subtitle={`${quietHoursStartLocalTime && quietHoursEndLocalTime ? `${quietHoursStartLocalTime}–${quietHoursEndLocalTime}` : 'No quiet hours'} · Snooze ${snoozeDurationMinutes} min`}>
        <Text style={styles.searchAccessNote}>Reminders inside quiet hours are delivered at the quiet-hours end.</Text>
        <View style={styles.settingsFieldStack}>
          {dateTimePicker.isSupported() ? <>
            <View style={styles.quietHoursInput}><Text style={styles.cardDetail}>{quietHoursStartLocalTime || 'Quiet hours start off'}</Text><TextButton label="Choose start" onPress={() => void pickQuietHour(setQuietHoursStartLocalTime, quietHoursStartLocalTime)} /></View>
            <View style={styles.quietHoursInput}><Text style={styles.cardDetail}>{quietHoursEndLocalTime || 'Quiet hours end off'}</Text><TextButton label="Choose end" onPress={() => void pickQuietHour(setQuietHoursEndLocalTime, quietHoursEndLocalTime)} /></View>
          </> : <>
            <AppTextInput accessibilityLabel="Quiet hours start" placeholder="HH:mm" placeholderTextColor={colors.muted} style={[styles.input, styles.quietHoursInput]} value={quietHoursStartLocalTime} onChangeText={setQuietHoursStartLocalTime} />
            <AppTextInput accessibilityLabel="Quiet hours end" placeholder="HH:mm" placeholderTextColor={colors.muted} style={[styles.input, styles.quietHoursInput]} value={quietHoursEndLocalTime} onChangeText={setQuietHoursEndLocalTime} />
          </>}
        </View>
        <Text style={styles.formLabel}>Snooze duration</Text>
        <Menu
          visible={snoozeMenuOpen}
          onDismiss={() => setSnoozeMenuOpen(false)}
          anchor={<Button mode="outlined" icon="clock-outline" accessibilityLabel="Choose snooze duration" style={styles.fullWidthControl} contentStyle={styles.fullWidthControlContent} onPress={() => setSnoozeMenuOpen(true)}>{snoozeDurationMinutes < 60 ? `${snoozeDurationMinutes}m` : `${snoozeDurationMinutes / 60}h`}</Button>}>
          {TASK_REMINDER_SNOOZE_DURATION_OPTIONS.map(duration => (
            <Menu.Item key={duration} title={duration < 60 ? `${duration} minutes` : `${duration / 60} ${duration === 60 ? 'hour' : 'hours'}`} leadingIcon={snoozeDurationMinutes === duration ? 'check' : undefined} onPress={() => {setSnoozeDurationMinutes(duration); setSnoozeMenuOpen(false);}} />
          ))}
        </Menu>
        </DeferredSection>
        {notificationSettingsError && <Text style={styles.errorText}>{notificationSettingsError}</Text>}
        {notificationSettingsMessage && <Text style={styles.successText}>{notificationSettingsMessage}</Text>}
        <PrimaryButton label={savingNotificationSettings ? 'Saving...' : 'Save notification settings'} onPress={() => void saveNotificationSettings()} disabled={savingNotificationSettings} />
      </Surface>
  );
}

function TimeGoalSettings() {
  const {colors, styles} = useThemeStyles();
  const {data, addTimeGoal} = useAppStore();
  const [name, setName] = useState('Attention');
  const [period, setPeriod] = useState<'day' | 'week'>('week');
  const [minutes, setMinutes] = useState('300');
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  async function save() {
    const parsedMinutes = Number.parseInt(minutes, 10);
    if (!name.trim() || !Number.isInteger(parsedMinutes) || parsedMinutes <= 0) {
      setError('Enter a name and positive minutes.');
      return;
    }
    try {
      await addTimeGoal({name: name.trim(), period, targetSeconds: parsedMinutes * 60});
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The time goal could not be saved.');
    }
  }

  return (
    <Surface style={styles.formCard} elevation={0}>
      <Text style={styles.cardTitle}>Time goal</Text>
      <DeferredSection title="Set time goal">
      <AppTextInput accessibilityLabel="Goal name" placeholder="Goal name" placeholderTextColor={colors.muted} style={styles.input} value={name} onChangeText={setName} />
      <View style={styles.segmentRow}>
        <SegmentButton label="Daily" selected={period === 'day'} onPress={() => setPeriod('day')} />
        <SegmentButton label="Weekly" selected={period === 'week'} onPress={() => setPeriod('week')} />
      </View>
      <AppTextInput accessibilityLabel="Goal minutes" keyboardType="number-pad" placeholder="Minutes" placeholderTextColor={colors.muted} style={styles.input} value={minutes} onChangeText={setMinutes} />
      <PrimaryButton label="Save goal" onPress={() => void save()} />
      </DeferredSection>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </Surface>
  );
}

function CodeUpdatesContent({bundleVersion, contained = true}: {bundleVersion: string; contained?: boolean}) {
  const {styles} = useThemeStyles();
  const [codeUpdateState, setCodeUpdateState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'prepared' | 'current' | 'error'>('idle');
  const [codeUpdateResult, setCodeUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [codeUpdateError, setCodeUpdateError] = useState<string | null>(null);
  const legacyNativeTransition = bundleVersion === '0.1.11';

  async function checkForCodeUpdate() {
    const preparedUpdate = codeUpdateResult?.kind === 'prepared' ? codeUpdateResult : null;
    setCodeUpdateState('checking');
    setCodeUpdateError(null);
    const result = await nativeBundleInstaller.checkForUpdate();
    if (preparedUpdate && (result.kind === 'error' || result.kind === 'unavailable')) {
      setCodeUpdateResult(preparedUpdate);
      setCodeUpdateState('prepared');
      return;
    }
    setCodeUpdateResult(result);
    if (result.kind === 'available') {
      setCodeUpdateState('available');
    } else if (result.kind === 'prepared') {
      setCodeUpdateState('prepared');
    } else if (result.kind === 'current') {
      setCodeUpdateState('current');
    } else {
      setCodeUpdateState('error');
      setCodeUpdateError(result.kind === 'unavailable' ? 'Code updates are not available in this build.' : formatCodeUpdateError(result.reasonCode));
    }
  }

  async function downloadCodeUpdate() {
    const preparedUpdate = codeUpdateResult?.kind === 'prepared' ? codeUpdateResult : null;
    setCodeUpdateState('downloading');
    setCodeUpdateError(null);
    const result = await nativeBundleInstaller.downloadUpdate();
    if (preparedUpdate && (result.kind === 'error' || result.kind === 'unavailable')) {
      setCodeUpdateResult(preparedUpdate);
      setCodeUpdateState('prepared');
      return;
    }
    setCodeUpdateResult(result);
    if (result.kind === 'prepared') {
      setCodeUpdateState('prepared');
    } else {
      setCodeUpdateState(result.kind === 'current' ? 'current' : 'error');
      if (result.kind === 'unavailable') {
        setCodeUpdateError('Code updates are not available in this build.');
      } else if (result.kind === 'error') {
        setCodeUpdateError(formatCodeUpdateError(result.reasonCode));
      } else if (result.kind !== 'current') {
        setCodeUpdateError('The update could not be prepared. Your current code is unchanged.');
      }
    }
  }

  return (
    <Surface style={contained ? styles.formCard : undefined} elevation={0}>
      <Text style={styles.cardDetail}>Yuzuha checks GitHub Releases for a newer verified JavaScript bundle. Native app changes still need a new APK. A downloaded update applies after you close and reopen Yuzuha.</Text>
      {legacyNativeTransition && (
        <>
          <Text style={styles.cardDetail}>This is the final update for the old Android shell. Install the latest Yuzuha APK once to enable automatic future APK updates.</Text>
          <PrimaryButton
            label="Open latest Yuzuha APK"
            onPress={() => void Linking.openURL('https://github.com/Tsukugi/Yuzuha/releases/latest')}
          />
        </>
      )}
      {codeUpdateResult?.kind === 'available' && <Text style={styles.cardDetail}>Version {codeUpdateResult.availableVersion} is available.</Text>}
      {codeUpdateState === 'current' && <Text style={styles.successText}>The installed code is up to date.</Text>}
      {codeUpdateState === 'prepared' && codeUpdateResult?.kind === 'prepared' && <Text style={styles.successText}>Version {codeUpdateResult.availableVersion} is ready. Close and reopen Yuzuha to apply it.</Text>}
      {codeUpdateState === 'error' && codeUpdateError && <Text style={styles.errorText}>{codeUpdateError}</Text>}
      <PrimaryButton
        label={codeUpdateState === 'checking' ? 'Checking...' : codeUpdateState === 'downloading' ? 'Downloading...' : codeUpdateState === 'available' ? 'Download update' : codeUpdateState === 'prepared' ? 'Update ready' : 'Check for updates'}
        onPress={codeUpdateState === 'available' ? () => void downloadCodeUpdate() : () => void checkForCodeUpdate()}
        disabled={codeUpdateState === 'checking' || codeUpdateState === 'downloading' || codeUpdateState === 'prepared'}
      />
    </Surface>
  );
}

function DataToolsScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {colors, styles} = useThemeStyles();
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
  const [exportOpen, setExportOpen] = useState(false);
  const [encryptedBackupOpen, setEncryptedBackupOpen] = useState(false);
  const [recoveryBackupOpen, setRecoveryBackupOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [jsonRestoreOpen, setJsonRestoreOpen] = useState(false);
  const [encryptedRestoreOpen, setEncryptedRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    <View style={styles.flex}>
      <View accessibilityLiveRegion="polite" style={styles.formActions}>
        {status && <Text style={styles.successText}>{status}</Text>}
        {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
      </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SecondaryHeader title="Data tools" backLabel="Home" onBack={onBack} />
      <Disclosure
        title="Export and backup"
        subtitle="Share or save a copy of this workspace"
        open={exportOpen}
        onPress={() => setExportOpen(current => !current)}>
        <Text style={styles.formLabel}>Share a copy</Text>
        <PrimaryButton label="Share JSON export" onPress={shareJson} />
        <PrimaryButton label="Share money CSV" onPress={shareCsv} />
        <Disclosure
          title="Encrypted backup"
          subtitle={backupPassword ? 'Password entered' : 'Password required'}
          open={encryptedBackupOpen}
          compact
          onPress={() => setEncryptedBackupOpen(current => !current)}>
          <AppTextInput
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
        </Disclosure>
        <Disclosure
          title="Recovery-key backup"
          subtitle={recoveryKey ? 'Key generated' : 'Create a separate encrypted copy'}
          open={recoveryBackupOpen}
          compact
          onPress={() => setRecoveryBackupOpen(current => !current)}>
          <Text style={styles.cardDetail}>Write the key down and confirm it before saving. Yuzuha does not store it.</Text>
          <PrimaryButton label={recoveryKey ? 'Generate a new recovery key' : 'Generate recovery key'} onPress={createRecoveryKey} disabled={backupBusy} />
          {!!recoveryKey && (
            <>
              <Text accessibilityLabel="Generated recovery key" style={styles.recoveryKey}>{recoveryKey}</Text>
              <AppTextInput
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
        </Disclosure>
      </Disclosure>
      <Disclosure
        title="Import money CSV"
        subtitle="Append current-format money entries"
        open={csvImportOpen}
        onPress={() => setCsvImportOpen(current => !current)}>
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
      </Disclosure>
      <Disclosure
        title="Restore JSON export"
        subtitle="Replace the workspace after preview and confirmation"
        open={jsonRestoreOpen}
        onPress={() => setJsonRestoreOpen(current => !current)}>
        <Text style={styles.cardDetail}>Choose or paste a current Yuzuha JSON export. Nothing changes until you review the count and confirm the replacement.</Text>
        <PrimaryButton label={jsonFileBusy ? 'Opening JSON export...' : 'Choose JSON export file'} onPress={openJsonImportFileFromDevice} disabled={jsonFileBusy || backupBusy} />
        <AppTextInput
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
      </Disclosure>
      <Disclosure
        title="Restore encrypted backup"
        subtitle="Decrypt and replace after validation"
        open={encryptedRestoreOpen}
        onPress={() => setEncryptedRestoreOpen(current => !current)}>
        <Text style={styles.cardDetail}>Paste the encrypted backup and enter its password or recovery key. The backup is decrypted and validated before any local data changes.</Text>
        <PrimaryButton label="Open encrypted backup file" onPress={openEncryptedBackupFileFromDevice} disabled={backupBusy} />
        <AppTextInput
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
        <AppTextInput
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
      </Disclosure>
      <Disclosure
        title="Delete local data"
        subtitle="Destructive action"
        open={deleteOpen}
        onPress={() => setDeleteOpen(current => !current)}>
        <Text style={styles.cardDetail}>Delete removes local records and keeps only the empty workspace defaults.</Text>
        <TextButton label="Delete all local data" danger onPress={confirmDelete} />
      </Disclosure>
    </ScrollView>
    </View>
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

function formatLocalTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function currentLocalDateTime(): string {
  const now = new Date();
  return `${localDateKey(now)}T${formatLocalTime(now)}`;
}

function moneyFilterPeriodLabel(period: MoneyRangePeriod, customInterval?: MoneyCustomInterval): string {
  if (period === 'all') {
    return 'All entries';
  }
  if (period === 'year') {
    return 'This year';
  }
  if (period === 'custom') {
    return customInterval ? `${formatLocalDate(customInterval.startLocalDate)} to ${formatLocalDate(customInterval.endLocalDate)}` : 'Custom interval';
  }
  return periodLabel(period);
}

function previousUsageRange(now: Date, period: Period, weekStartsOn: WeekStartDay) {
  const current = getPeriodRange(now, period, weekStartsOn);
  if (period === 'month') {
    const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    return {start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1)};
  }
  const days = period === 'day' ? 1 : 7;
  const start = new Date(current.start);
  const end = new Date(current.end);
  start.setDate(start.getDate() - days);
  end.setDate(end.getDate() - days);
  return {start, end};
}

function formatUsageMetric<T>(metric: UsageMetric<T>, format: (value: T) => string): string {
  if (metric.status === 'available') {
    return format(metric.value);
  }
  if (metric.status === 'empty') {
    return 'No data';
  }
  return 'Unavailable';
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

export function MoneyScreen({focusMoneyId, focusBudgetId, openAdd, onAddHandled, onFocusHandled, onBudgetFocusHandled, onSecondaryScreenChange, onOpenSettings}: {focusMoneyId: string | null; focusBudgetId: string | null; openAdd: boolean; onAddHandled: () => void; onFocusHandled: () => void; onBudgetFocusHandled: () => void; onSecondaryScreenChange: (open: boolean) => void; onOpenSettings: () => void}) {
  const {colors, styles} = useThemeStyles();
  const {
    data,
    addMoney,
    addMoneyRecurrence,
    updateMoney,
    deleteMoney,
  } = useAppStore();
  const [kind, setKind] = useState<MoneyKind>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [note, setNote] = useState('');
  const [occurredAtLocalDateTime, setOccurredAtLocalDateTime] = useState(currentLocalDateTime());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceCadence, setRecurrenceCadence] = useState<RecurrenceCadence>('month');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<RecurrenceWeekday[]>(ALL_RECURRENCE_WEEKDAYS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<MoneyView>('entry');
  useAndroidBack(entryFormOpen || view !== 'entry', 30, () => {
    if (saving) return;
    if (entryFormOpen) confirmDiscard(resetForm);
    else setView('entry');
  });
  const [entryFiltersOpen, setEntryFiltersOpen] = useState(false);
  const [entryPeriodMenuOpen, setEntryPeriodMenuOpen] = useState(false);
  useAndroidBack(entryPeriodMenuOpen, 100, () => setEntryPeriodMenuOpen(false));
  const [entryDetailsOpen, setEntryDetailsOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [entryFilterPeriod, setEntryFilterPeriod] = useState<MoneyFilterPeriod>(emptyMoneyEntryFilter.period);
  const [entryFilterCustomStart, setEntryFilterCustomStart] = useState(localDateKey(new Date()));
  const [entryFilterCustomEnd, setEntryFilterCustomEnd] = useState(localDateKey(new Date()));
  const [entryFilterKind, setEntryFilterKind] = useState<MoneyKind | 'all'>(emptyMoneyEntryFilter.kind);
  const [entryFilterCategoryId, setEntryFilterCategoryId] = useState<string | 'all'>(emptyMoneyEntryFilter.categoryId);
  const [entryFilterAccountId, setEntryFilterAccountId] = useState<string | 'all'>(emptyMoneyEntryFilter.accountId);

  useEffect(() => {
    onSecondaryScreenChange(isMoneySecondaryView(view) || entryFormOpen);
    return () => onSecondaryScreenChange(false);
  }, [entryFormOpen, onSecondaryScreenChange, view]);

  useEffect(() => {
    if (!openAdd) {
      return;
    }
    setKind('expense');
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setPayeeId('');
    setNote('');
    setOccurredAtLocalDateTime(currentLocalDateTime());
    setEditingId(null);
    setRecurrenceEnabled(false);
    setRecurrenceCadence('month');
    setRecurrenceInterval('1');
    setRecurrenceWeekdays([...ALL_RECURRENCE_WEEKDAYS]);
    setEntryDetailsOpen(false);
    setError(null);
    setEntryFormOpen(true);
    onAddHandled();
  }, [onAddHandled, openAdd]);

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
    setOccurredAtLocalDateTime(formatTaskReminderLocalDateTime(new Date(entry.occurredAt).getTime()));
    setEntryFormOpen(true);
    setError(null);
    onFocusHandled();
  }, [data, focusMoneyId, onFocusHandled]);

  useEffect(() => {
    if (focusBudgetId) {
      setView('budget');
    }
  }, [focusBudgetId]);

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
    return <MoneyBudgetScreen data={currentData} focusBudgetId={focusBudgetId} onFocusHandled={onBudgetFocusHandled} onBack={() => setView('entry')} />;
  }
  if (view === 'recurrence') {
    return <MoneyRecurrenceScreen data={currentData} onBack={() => setView('entry')} onAdd={() => { setView('entry'); startNewEntry(true); }} />;
  }
  if (view === 'balances') {
    return <MoneyBalancesScreen data={currentData} onBack={() => setView('entry')} />;
  }

  async function save() {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setError(null);
    setSaving(true);
    const occurredAtMillis = parseTaskReminderLocalDateTime(occurredAtLocalDateTime.trim());
    if (occurredAtMillis === null) {
      setError('Choose a valid money date and time.');
      setSaving(false);
      return;
    }
    const occurredAt = new Date(occurredAtMillis).toISOString();
    const selectedCategory =
      currentData.categories.find(item => item.id === categoryId && (item.kind === kind || item.kind === 'both')) ??
      currentData.categories.find(item => item.kind === kind || item.kind === 'both');
    const selectedAccount = currentData.accounts.find(item => item.id === (accountId || activeAccountId)) ?? activeAccounts[0];
    const input = {
      kind,
      amountMinor: Math.round(parsed * 100),
      currency: selectedAccount?.currency ?? currentData.mainCurrency,
      accountId: selectedAccount?.id ?? null,
      categoryId: selectedCategory?.id ?? null,
      payeeId: payeeId || null,
      category: selectedCategory?.name ?? 'Uncategorized',
      note: note.trim(),
      occurredAt,
    };
    try {
      if (editingId) {
        await updateMoney(editingId, input);
      } else if (recurrenceEnabled) {
        const parsedInterval = Number.parseInt(recurrenceInterval.trim(), 10);
        await addMoneyRecurrence({
          kind,
          amountMinor: input.amountMinor,
          currency: input.currency,
          accountId: input.accountId ?? '',
          categoryId: input.categoryId,
          category: input.category,
          note: input.note,
          cadence: recurrenceCadence,
          interval: Number.isFinite(parsedInterval) ? parsedInterval : 0,
          weekdays: recurrenceCadence === 'day' && parsedInterval === 1 ? recurrenceWeekdays : ALL_RECURRENCE_WEEKDAYS,
          nextOccurrenceLocalDate: occurredAtLocalDateTime.slice(0, 10),
          missedOccurrencePolicy: 'all',
        });
      } else {
        await addMoney(input);
      }
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The money entry could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setAmount('');
    setPayeeId('');
    setNote('');
    setOccurredAtLocalDateTime(currentLocalDateTime());
    setEditingId(null);
    setRecurrenceEnabled(false);
    setRecurrenceWeekdays([...ALL_RECURRENCE_WEEKDAYS]);
    setEntryFormOpen(false);
    setError(null);
  }

  function startNewEntry(repeat = false) {
    setKind('expense');
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setPayeeId('');
    setNote('');
    setOccurredAtLocalDateTime(currentLocalDateTime());
    setEditingId(null);
    setRecurrenceEnabled(repeat);
    setRecurrenceCadence('month');
    setRecurrenceInterval('1');
    setRecurrenceWeekdays([...ALL_RECURRENCE_WEEKDAYS]);
    setEntryDetailsOpen(false);
    setError(null);
    setEntryFormOpen(true);
  }

  function startEdit(entry: AppData['money'][number]) {
    setEditingId(entry.id);
    setKind(entry.kind);
    setAmount((entry.amountMinor / 100).toFixed(2));
    setCategoryId(entry.categoryId ?? '');
    setAccountId(entry.accountId ?? '');
    setPayeeId(entry.payeeId ?? '');
    setNote(entry.note);
    setOccurredAtLocalDateTime(formatTaskReminderLocalDateTime(new Date(entry.occurredAt).getTime()));
    setRecurrenceEnabled(false);
    setRecurrenceWeekdays([...ALL_RECURRENCE_WEEKDAYS]);
    setEntryFormOpen(true);
    setError(null);
  }

  function toggleRecurrenceWeekday(day: RecurrenceWeekday) {
    setRecurrenceWeekdays(current => current.includes(day)
      ? current.filter(value => value !== day)
      : [...current, day].sort((left, right) => left - right));
  }

  async function removeEditing() {
    if (!editingId) {
      return;
    }
    await deleteMoney(editingId);
    resetForm();
  }

  const visibleCategories = data.categories.filter(
    item => !item.isArchived && (item.kind === kind || item.kind === 'both'),
  );
  const activeCategoryId = categoryId || visibleCategories[0]?.id;
  const activeAccounts = data.accounts.filter(account => !account.isArchived);
  const hasAccountChoice = activeAccounts.length > 1;
  const activeAccountId = accountId || activeAccounts[0]?.id;
  const visiblePayees = data.payees.filter(payee => !payee.isArchived || payee.id === payeeId);
  const payeeNames = new Map(data.payees.map(payee => [payee.id, payee.name]));
  const entryFilter = {
    period: entryFilterPeriod,
    kind: entryFilterKind,
    categoryId: entryFilterCategoryId,
    accountId: hasAccountChoice ? entryFilterAccountId : 'all',
    ...(entryFilterPeriod === 'custom' ? {customInterval: {startLocalDate: entryFilterCustomStart, endLocalDate: entryFilterCustomEnd}} : {}),
  } as const;
  const listSourceEntries = data.money.filter(
    entry => !entry.splitId && !data.splits.some(split => split.parentEntryId === entry.id),
  );
  let listEntries: MoneyEntry[] = [];
  let entryFilterError: string | null = null;
  try {
    listEntries = filterMoneyEntries(listSourceEntries, entryFilter, new Date(), data.weekStartsOn);
  } catch (filterError) {
    entryFilterError = filterError instanceof Error ? filterError.message : 'Choose a valid money interval.';
  }
  const filteredTotals = summarizeMoneyEntries(listEntries);
  const mainCurrencyAccounts = data.accounts.filter(account => !account.isArchived && account.currency === currentData.mainCurrency);
  const totalBalanceMinor = mainCurrencyAccounts.reduce(
    (total, account) => total + calculateAccountBalance(account, currentData.money, currentData.transfers),
    0,
  );
  const mainFilteredTotal = filteredTotals.find(total => total.currency === currentData.mainCurrency);
  const otherCurrencyTotals = filteredTotals.filter(total => total.currency !== currentData.mainCurrency);
  let chartRange: ReturnType<typeof getMoneyRange> = null;
  try {
    chartRange = getMoneyRange(new Date(), entryFilterPeriod === 'custom'
      ? {period: 'custom', startLocalDate: entryFilterCustomStart, endLocalDate: entryFilterCustomEnd}
      : {period: entryFilterPeriod}, currentData.weekStartsOn);
  } catch {
    chartRange = null;
  }
  const chartData = buildMoneyChartData(
    currentData.money,
    currentData.splits,
    chartRange,
    currentData.mainCurrency,
    {kind: entryFilterKind, categoryId: entryFilterCategoryId, accountId: entryFilter.accountId},
  );
  const filterCategories = data.categories.filter(category => !category.isArchived || category.id === entryFilterCategoryId);
  const filterAccounts = data.accounts.filter(account => !account.isArchived || account.id === entryFilterAccountId);
  const activeEntryFilterLabels = [
    entryFilterPeriod !== 'all' ? moneyFilterPeriodLabel(entryFilterPeriod, entryFilter.customInterval) : null,
    entryFilterKind !== 'all' ? entryFilterKind[0].toUpperCase() + entryFilterKind.slice(1) : null,
    entryFilterCategoryId !== 'all' ? data.categories.find(category => category.id === entryFilterCategoryId)?.name ?? 'Selected category' : null,
    entryFilter.accountId !== 'all' ? data.accounts.find(account => account.id === entryFilter.accountId)?.name ?? 'Selected account' : null,
  ].filter(Boolean);
  const entryFilterSummary = activeEntryFilterLabels.length > 0 ? activeEntryFilterLabels.join(' · ') : 'All time';
  const entryHeaderSubtitle = `${listEntries.length} ${listEntries.length === 1 ? 'entry' : 'entries'} · ${entryFilterSummary}`;

  function renderEntryList() {
    return (
      <>
        {entryFilterError ? (
          <EmptyState text={entryFilterError} />
        ) : listEntries.length === 0 ? (
          <EmptyState text={listSourceEntries.length === 0 ? 'No money entries yet.' : 'No money entries match these filters.'} />
        ) : (
          listEntries.map(entry => (
            <TouchableRipple
              key={entry.id}
              accessibilityLabel={`Edit ${entry.category} ${formatMoney(entry.amountMinor, entry.currency)}`}
              accessibilityRole="button"
              style={styles.listRow}
              onPress={() => startEdit(entry)}>
              <View style={styles.touchableRowContent}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{entry.category}</Text>
                  <Text style={styles.listMeta}>
                    {[entry.payeeId ? payeeNames.get(entry.payeeId) : null, entry.note || null, formatDateTime(entry.occurredAt)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={[styles.amount, entry.kind === 'income' ? styles.incomeText : styles.expenseText]}>
                  {entry.kind === 'income' ? '+' : '-'}
                  {formatMoney(entry.amountMinor, entry.currency)}
                </Text>
              </View>
            </TouchableRipple>
            ))
        )}
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, !entryFormOpen && styles.fabScrollContent]} keyboardShouldPersistTaps="handled">
        <TabHeader
          title="Money"
          subtitle={entryFormOpen ? editingId ? 'Edit entry' : recurrenceEnabled ? 'New periodic operation' : 'New entry' : entryHeaderSubtitle}
          actions={entryFormOpen ? [] : [
            {label: 'Budgets', icon: 'wallet-outline', onPress: () => setView('budget')},
            {label: 'Report', icon: 'chart-bar', onPress: () => setView('report')},
            {label: 'Transfer', icon: 'swap-horizontal', onPress: () => setView('transfer')},
            {label: 'Split entry', icon: 'format-list-bulleted', onPress: () => setView('split')},
            {label: 'Periodic money', icon: 'repeat', onPress: () => setView('recurrence')},
            {label: 'Account balances', icon: 'bank-outline', onPress: () => setView('balances')},
          ]}
          onOpenSettings={onOpenSettings}
        />
        {!entryFormOpen && (
          <Disclosure
            title="Filters"
            subtitle={activeEntryFilterLabels.length > 0 ? entryFilterSummary : undefined}
            open={entryFiltersOpen}
            compact
            onPress={() => setEntryFiltersOpen(current => !current)}>
            <Text style={styles.formLabel}>Period</Text>
            <Menu
              visible={entryPeriodMenuOpen}
              onDismiss={() => setEntryPeriodMenuOpen(false)}
              anchor={
                <Button mode="outlined" icon="calendar-range" accessibilityLabel="Choose money period" style={styles.fullWidthControl} contentStyle={styles.fullWidthControlContent} onPress={() => setEntryPeriodMenuOpen(true)}>
                  {entryFilterPeriod === 'all' ? 'All time' : moneyRangePeriodLabel(entryFilterPeriod)}
                </Button>
              }>
              {(['all', 'day', 'week', 'month', 'year', 'custom'] as MoneyFilterPeriod[]).map(option => (
                <Menu.Item key={option} title={option === 'all' ? 'All time' : moneyRangePeriodLabel(option)} leadingIcon={entryFilterPeriod === option ? 'check' : undefined} onPress={() => {setEntryFilterPeriod(option); setEntryPeriodMenuOpen(false);}} />
              ))}
            </Menu>
            {entryFilterPeriod === 'custom' && (
              <View style={styles.inlinePanel}>
                <Text style={styles.cardDetail}>Start is included; end is excluded.</Text>
                {dateTimePicker.isSupported() ? <>
                  <TextButton label={`Start: ${formatLocalDate(entryFilterCustomStart)}`} onPress={() => void (async () => {
                  try {
                    const selected = await dateTimePicker.pickDate(entryFilterCustomStart);
                    if (selected) setEntryFilterCustomStart(selected);
                  } catch (pickerError) {
                    setError(pickerError instanceof Error ? pickerError.message : 'The start date picker failed.');
                  }
                })()} />
                <TextButton label={`End: ${formatLocalDate(entryFilterCustomEnd)}`} onPress={() => void (async () => {
                  try {
                    const selected = await dateTimePicker.pickDate(entryFilterCustomEnd);
                    if (selected) setEntryFilterCustomEnd(selected);
                  } catch (pickerError) {
                    setError(pickerError instanceof Error ? pickerError.message : 'The end date picker failed.');
                  }
                })()} />
                </> : <>
                  <AppTextInput accessibilityLabel="Filter start date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={entryFilterCustomStart} onChangeText={setEntryFilterCustomStart} />
                  <AppTextInput accessibilityLabel="Filter end date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={entryFilterCustomEnd} onChangeText={setEntryFilterCustomEnd} />
                </>}
              </View>
            )}
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
            {hasAccountChoice && (
              <>
                <Text style={styles.formLabel}>Account</Text>
                <View style={styles.chipWrap}>
                  <ChipButton label="All" selected={entryFilterAccountId === 'all'} onPress={() => setEntryFilterAccountId('all')} />
                  {filterAccounts.map(account => (
                    <ChipButton key={account.id} label={account.name} selected={entryFilterAccountId === account.id} onPress={() => setEntryFilterAccountId(account.id)} />
                  ))}
                </View>
              </>
            )}
          </Disclosure>
        )}
        {!entryFormOpen && (
          <TouchableRipple accessibilityLabel="Open account balances" onPress={() => setView('balances')} style={[styles.moneyOverviewCard, styles.cardShadow]}>
            <View>
              <View style={styles.moneyBalanceCard}>
                <Text style={styles.moneyBalanceLabel}>Total balance</Text>
                <Text style={styles.moneyBalanceValue}>{formatMoney(totalBalanceMinor, currentData.mainCurrency)}</Text>
              </View>
              {mainFilteredTotal && mainFilteredTotal.count > 0 && <View style={styles.moneyActivityRow}>
                <View>
                  <Text style={styles.moneyOverviewMeta}>Spent</Text>
                  <Text style={styles.moneyActivityValue}>{formatMoney(mainFilteredTotal.expenseMinor, currentData.mainCurrency)}</Text>
                </View>
                <View style={styles.moneyActivityRight}>
                  <Text style={styles.moneyOverviewMeta}>Net</Text>
                  <Text style={styles.moneyActivityValue}>{formatMoney(mainFilteredTotal.incomeMinor - mainFilteredTotal.expenseMinor, currentData.mainCurrency)}</Text>
                </View>
              </View>}
            </View>
          </TouchableRipple>
        )}
        {!entryFormOpen && renderEntryList()}
        {!entryFormOpen && (
          <Disclosure
            title="Spending overview"
            subtitle={activeEntryFilterLabels.length > 0 ? entryFilterSummary : undefined}
            open={chartOpen}
            onPress={() => setChartOpen(current => !current)}>
            <MoneyChartCard data={chartData} currency={currentData.mainCurrency} scope={entryFilterSummary} hasDailyRange={chartRange !== null} />
          </Disclosure>
        )}
        {!entryFormOpen && (
          <>
        {otherCurrencyTotals.length > 0 && <>
          <SectionTitle title="Other currencies" />
          {otherCurrencyTotals.map(total => (
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
          ))}
        </>}
          </>
        )}
        {entryFormOpen && (
          <>
        {editingId && (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerText}>Editing an entry</Text>
            <TextButton label="Cancel" onPress={resetForm} disabled={saving} />
          </View>
        )}
        <View style={styles.formCard}>
          <ChoiceMenu label="Type" value={kind} options={[{value: 'expense', label: 'Expense'}, {value: 'income', label: 'Income'}]} onSelect={setKind} />
          <Text style={styles.formLabel}>Amount</Text>
          <AppTextInput
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <ChoiceMenu label="Category" value={activeCategoryId ?? ''} options={visibleCategories.map(category => ({value: category.id, label: category.name}))} onSelect={setCategoryId} />
          <AccountSelector accounts={activeAccounts} selectedAccountId={activeAccountId ?? ''} onSelect={setAccountId} />
          {!editingId && (
            <DeferredSection title="Repeat operation" subtitle={recurrenceEnabled ? `Every ${recurrenceInterval} ${recurrenceCadence}${recurrenceInterval === '1' ? '' : 's'}` : 'Optional'} revealKey={recurrenceEnabled ? 'enabled' : null}>
              <ToggleButton label="Repeat" value={recurrenceEnabled} onPress={() => setRecurrenceEnabled(current => !current)} />
              {recurrenceEnabled && (
                <View style={styles.recurrenceOptions}>
                  <Text style={styles.cardDetail}>Yuzuha adds this operation on its local calendar dates when you open the app.</Text>
                  <Text style={styles.formLabel}>Repeat every</Text>
                  <AppTextInput
                    accessibilityLabel="Periodic interval"
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={recurrenceInterval}
                    onChangeText={setRecurrenceInterval}
                  />
                  <View style={styles.segmentRow}>
                    <SegmentButton label="Day" selected={recurrenceCadence === 'day'} onPress={() => setRecurrenceCadence('day')} />
                    <SegmentButton label="Week" selected={recurrenceCadence === 'week'} onPress={() => setRecurrenceCadence('week')} />
                    <SegmentButton label="Month" selected={recurrenceCadence === 'month'} onPress={() => setRecurrenceCadence('month')} />
                  </View>
                  {recurrenceCadence === 'day' && Number.parseInt(recurrenceInterval.trim(), 10) === 1 && (
                    <>
                      <Text style={styles.formLabel}>Repeat on</Text>
                      <View style={styles.chipWrap}>
                        {RECURRENCE_WEEKDAY_OPTIONS.map(day => (
                          <ChipButton
                            key={day.value}
                            label={day.label}
                            selected={recurrenceWeekdays.includes(day.value)}
                            onPress={() => toggleRecurrenceWeekday(day.value)}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </DeferredSection>
          )}
          <Disclosure
            title="More entry details"
            subtitle={`${formatLocalDateTime(occurredAtLocalDateTime)} · Date, payee and note`}
            open={entryDetailsOpen}
            compact
            onPress={() => setEntryDetailsOpen(current => !current)}>
          <Text style={styles.formLabel}>Occurred date and time</Text>
          <View style={styles.inlinePanel}>
            {dateTimePicker.isSupported() ? <>
              <Text style={styles.cardDetail}>{occurredAtLocalDateTime ? formatLocalDateTime(occurredAtLocalDateTime) : 'Choose a local date and time'}</Text>
              <TextButton label="Choose date" onPress={() => void (async () => {
              try {
                const currentDate = occurredAtLocalDateTime.slice(0, 10) || localDateKey(new Date());
                const selectedDate = await dateTimePicker.pickDate(currentDate);
                if (!selectedDate) return;
                const currentTime = occurredAtLocalDateTime.slice(11, 16) || formatLocalTime(new Date());
                setOccurredAtLocalDateTime(`${selectedDate}T${currentTime}`);
              } catch (pickerError) {
                setError(pickerError instanceof Error ? pickerError.message : 'The money date picker failed.');
              }
            })()} />
            <TextButton label="Choose time" onPress={() => void (async () => {
              try {
                const currentTime = occurredAtLocalDateTime.slice(11, 16) || formatLocalTime(new Date());
                const selectedTime = await dateTimePicker.pickTime(currentTime);
                if (!selectedTime) return;
                const currentDate = occurredAtLocalDateTime.slice(0, 10) || localDateKey(new Date());
                setOccurredAtLocalDateTime(`${currentDate}T${selectedTime}`);
              } catch (pickerError) {
                setError(pickerError instanceof Error ? pickerError.message : 'The money time picker failed.');
              }
            })()} />
            </> : (
              <AppTextInput accessibilityLabel="Occurred local date and time" placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.muted} style={styles.input} value={occurredAtLocalDateTime} onChangeText={setOccurredAtLocalDateTime} />
            )}
          </View>
            <Text style={styles.formLabel}>Payee (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No payee" selected={payeeId === ''} onPress={() => setPayeeId('')} />
              {visiblePayees.map(payee => (
                <ChipButton key={payee.id} label={payee.name} selected={payee.id === payeeId} onPress={() => setPayeeId(payee.id)} />
              ))}
            </View>
            <Text style={styles.formLabel}>Note (optional)</Text>
            <AppTextInput
              accessibilityLabel="Money note"
              placeholder="What was this for?"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.multilineInput]}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </Disclosure>
          {error && <Text style={styles.errorText}>{error}</Text>}

        </View>
          </>
        )}

      </ScrollView>
      {entryFormOpen && <View accessibilityLabel="Money form actions" style={styles.formActions}>
          <PrimaryButton label={saving ? 'Saving...' : editingId ? 'Update entry' : recurrenceEnabled ? 'Save periodic operation' : 'Save entry'} onPress={save} disabled={saving} />
          <TextButton label="Cancel" onPress={resetForm} disabled={saving} />
          {editingId && <TextButton label="Delete entry" danger onPress={removeEditing} disabled={saving} />}
      </View>}
      {!entryFormOpen && <FloatingActionButton label="Add money entry" onPress={() => startNewEntry()} />}
    </KeyboardAvoidingView>
  );
}

function MoneyBalancesScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {styles} = useThemeStyles();
  const activeAccounts = data.accounts.filter(account => !account.isArchived);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SecondaryHeader title="Account balances" backLabel="Money" onBack={onBack} />
      {activeAccounts.map(account => (
        <View key={account.id} style={styles.formCard}>
          <Text style={styles.cardTitle}>{account.name}</Text>
          <Text style={styles.amount}>{formatMoney(calculateAccountBalance(account, data.money, data.transfers), account.currency)}</Text>
        </View>
      ))}
      {activeAccounts.length === 0 && <View style={styles.formCard}><Text style={styles.cardDetail}>No active accounts.</Text></View>}
    </ScrollView>
  );
}

function MoneyChartCard({data, currency, scope, hasDailyRange}: {data: MoneyChartData; currency: string; scope: string; hasDailyRange: boolean}) {
  const {styles} = useThemeStyles();
  const spendingCategories = data.categories.filter(category => category.expenseMinor > 0);
  const maxCategoryExpense = Math.max(...spendingCategories.map(category => category.expenseMinor), 1);
  const maxDailyValue = Math.max(...data.daily.flatMap(point => [point.expenseMinor, point.incomeMinor]), 1);

  return (
    <View style={styles.inlinePanel}>
      <View style={styles.moneyChartHeader}>
        <Text style={styles.moneyChartTitle}>Spending overview</Text>
        <Text style={styles.moneyOverviewMeta}>{scope}</Text>
      </View>
      <Text style={styles.cardDetail}>Top expense categories in {currency}. Transfers are not included.</Text>
      {spendingCategories.length === 0 ? (
        <Text style={styles.chartEmpty}>No spending matches this scope.</Text>
      ) : (
        spendingCategories.map(category => (
          <View key={category.name} style={styles.chartBarRow} accessible accessibilityLabel={`${category.name}, ${formatMoney(category.expenseMinor, currency)} spent`}>
            <View style={styles.chartBarHeader}>
              <Text style={styles.chartBarLabel}>{category.name}</Text>
              <Text style={styles.chartBarAmount}>{formatMoney(category.expenseMinor, currency)}</Text>
            </View>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBarFill, {width: `${Math.max(4, Math.round((category.expenseMinor / maxCategoryExpense) * 100))}%`}]} />
            </View>
          </View>
        ))
      )}

      <View style={styles.chartDivider} />
      <View style={styles.moneyChartHeader}>
        <Text style={styles.moneyChartSubtitle}>Daily movement</Text>
        <View style={styles.chartLegend}>
          <View style={styles.chartLegendItem}><View style={styles.chartLegendExpense} /><Text style={styles.chartLegendText}>Spent</Text></View>
          <View style={styles.chartLegendItem}><View style={styles.chartLegendIncome} /><Text style={styles.chartLegendText}>Income</Text></View>
        </View>
      </View>
      {!hasDailyRange ? (
        <Text style={styles.chartEmpty}>Choose Day, Week, or Month in Filter entries to see the daily trend.</Text>
      ) : (
        <View style={styles.chartStrip} accessible accessibilityLabel={`Daily movement for ${scope}`}>
          {data.daily.map((point, index) => {
            const showLabel = data.daily.length <= 8 || index === 0 || index === data.daily.length - 1 || index % 7 === 0;
            return (
              <View key={point.localDate} style={styles.chartColumn}>
                <View style={styles.chartColumnBars}>
                  <View style={[styles.chartColumnBar, styles.chartColumnExpense, {height: point.expenseMinor === 0 ? 0 : Math.max(3, Math.round((point.expenseMinor / maxDailyValue) * 66))}]} />
                  <View style={[styles.chartColumnBar, styles.chartColumnIncome, {height: point.incomeMinor === 0 ? 0 : Math.max(3, Math.round((point.incomeMinor / maxDailyValue) * 66))}]} />
                </View>
                {showLabel && <Text style={styles.chartDayLabel}>{formatLocalDate(point.localDate).slice(0, 5)}</Text>}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

interface SplitLineDraft {
  categoryId: string;
  amount: string;
  note: string;
}

function MoneyRecurrenceScreen({data, onBack, onAdd}: {data: AppData; onBack: () => void; onAdd: () => void}) {
  const {styles} = useThemeStyles();
  const {setMoneyRecurrencePaused, deleteMoneyRecurrence} = useAppStore();
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rules = [...data.recurrences].sort((left, right) => {
    if (left.isPaused !== right.isPaused) {
      return left.isPaused ? 1 : -1;
    }
    return left.nextOccurrenceLocalDate.localeCompare(right.nextOccurrenceLocalDate);
  });
  const accountNames = new Map(data.accounts.map(account => [account.id, account.name]));

  async function toggleRule(rule: AppData['recurrences'][number]) {
    setBusyRuleId(rule.id);
    setError(null);
    try {
      await setMoneyRecurrencePaused(rule.id, !rule.isPaused);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The periodic operation could not be updated.');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function removeRule(ruleId: string) {
    setBusyRuleId(ruleId);
    setError(null);
    try {
      await deleteMoneyRecurrence(ruleId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The periodic operation could not be deleted.');
    } finally {
      setBusyRuleId(null);
    }
  }

  function confirmDelete(rule: AppData['recurrences'][number]) {
    Alert.alert('Delete periodic operation?', `Delete the ${rule.kind} for ${rule.category}? Existing entries stay in Money.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => void removeRule(rule.id)},
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SecondaryHeader title="Periodic money" backLabel="Money" onBack={onBack} />
        {error && <Text style={styles.errorText}>{error}</Text>}
        {rules.length === 0 ? (
          <>
            <EmptyState text="No periodic operations yet." />
            <PrimaryButton label="Add periodic operation" onPress={onAdd} />
          </>
        ) : (
          rules.map(rule => (
            <View key={rule.id} style={styles.formCard}>
              <Text style={styles.cardTitle}>{rule.kind === 'income' ? 'Income' : 'Expense'}</Text>
              <Text style={styles.listTitle}>{rule.category}</Text>
              <Text style={styles.cardDetail}>{accountNames.get(rule.accountId ?? '') ?? 'Archived account'} · Every {rule.interval} {rule.cadence}{rule.interval === 1 ? '' : 's'}{rule.cadence === 'day' && rule.interval === 1 ? ` · ${formatRecurrenceWeekdays(rule.weekdays)}` : ''}</Text>
              <Text style={styles.cardDetail}>{rule.isPaused ? `Paused · next date stays ${formatLocalDate(rule.nextOccurrenceLocalDate)}` : `Next date: ${formatLocalDate(rule.nextOccurrenceLocalDate)}`}</Text>
              <MenuActions accessibilityLabel={`Manage periodic ${rule.category}`} disabled={busyRuleId !== null} actions={[
                {label: rule.isPaused ? 'Resume' : 'Pause', onPress: () => void toggleRule(rule)},
                {label: 'Delete', danger: true, onPress: () => confirmDelete(rule)},
              ]} />
            </View>
          ))
        )}
        {rules.length > 0 && <PrimaryButton label="Add periodic operation" onPress={onAdd} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyBudgetScreen({data, focusBudgetId, onFocusHandled, onBack}: {data: AppData; focusBudgetId: string | null; onFocusHandled: () => void; onBack: () => void}) {
  const {colors, styles} = useThemeStyles();
  const {addMoneyBudget, updateMoneyBudget, deleteMoneyBudget} = useAppStore();
  const focusedBudget = focusBudgetId ? data.budgets.find(item => item.id === focusBudgetId) ?? null : null;
  const categories = data.categories.filter(category => (!category.isArchived || category.id === focusedBudget?.categoryId) && (category.kind === 'expense' || category.kind === 'both'));
  const currencies = [...new Set([...data.accounts.filter(account => !account.isArchived).map(account => account.currency), ...(focusedBudget ? [focusedBudget.currency] : [])])];
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [currency, setCurrency] = useState(currencies[0] ?? data.mainCurrency);
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const [rollover, setRollover] = useState<BudgetRollover>('none');
  const [amount, setAmount] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusBudgetId) {
      return;
    }
    const budget = data.budgets.find(item => item.id === focusBudgetId);
    if (!budget) {
      onFocusHandled();
      return;
    }
    setEditingBudgetId(budget.id);
    setBudgetFormOpen(true);
    setCategoryId(budget.categoryId);
    setCurrency(budget.currency);
    setPeriod(budget.period);
    setRollover(budget.rollover);
    setAmount((budget.amountMinor / 100).toFixed(2));
    setError(null);
    onFocusHandled();
  }, [data, focusBudgetId, onFocusHandled]);

  function resetForm() {
    setEditingBudgetId(null);
    setBudgetFormOpen(false);
    setAmount('');
    setError(null);
  }

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
      if (editingBudgetId) {
        await updateMoneyBudget(editingBudgetId, input);
      } else {
        await addMoneyBudget(input);
      }
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Budget could not be saved.');
    }
  }

  async function removeBudget(budgetId: string) {
    await deleteMoneyBudget(budgetId);
    if (editingBudgetId === budgetId) {
      resetForm();
    }
  }

  if (categories.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SecondaryHeader title="Budgets" backLabel="Money" onBack={onBack} />
        <EmptyState text="Add an active expense category before creating a budget." />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SecondaryHeader title="Budgets" backLabel="Money" onBack={onBack} />
        <Disclosure
          title={editingBudgetId ? 'Edit budget' : 'New budget'}
          subtitle={editingBudgetId ? 'Update this category limit' : 'Set a category limit'}
          open={budgetFormOpen}
          onPress={() => setBudgetFormOpen(current => !current)}>
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
          <AppTextInput
            accessibilityLabel="Budget limit"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={editingBudgetId ? 'Update budget' : 'Save budget'} onPress={save} />
          {editingBudgetId && <TextButton label="Cancel budget edit" onPress={resetForm} />}
        </Disclosure>
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
                <MenuActions accessibilityLabel={`Manage ${budget.category} budget`} actions={[
                  {label: 'Edit', onPress: () => {
                    setEditingBudgetId(budget.id);
                    setCategoryId(budget.categoryId);
                    setCurrency(budget.currency);
                    setPeriod(budget.period);
                    setRollover(budget.rollover);
                    setAmount((budget.amountMinor / 100).toFixed(2));
                    setError(null);
                    setBudgetFormOpen(true);
                  }},
                  {label: 'Delete', danger: true, onPress: () => void removeBudget(budget.id)},
                ]} />
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
  const {colors, styles} = useThemeStyles();
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
        <SecondaryHeader title="Split entry" backLabel="Money" onBack={onBack} />
        <EmptyState text="Add an active account and at least two matching categories before creating a split entry." />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SecondaryHeader title="Split entry" backLabel="Money" onBack={onBack} />
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Expense" selected={kind === 'expense'} onPress={() => changeKind('expense')} />
            <SegmentButton label="Income" selected={kind === 'income'} onPress={() => changeKind('income')} />
          </View>
          <AccountSelector accounts={activeAccounts} selectedAccountId={accountId} onSelect={setAccountId} includeCurrency />
          <Text style={styles.formLabel}>Parent amount ({currency})</Text>
          <AppTextInput
            accessibilityLabel="Split parent amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.cardDetail}>Line amounts must equal this total.</Text>
          <Text style={styles.formLabel}>Parent note (optional)</Text>
          <AppTextInput
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
              <AppTextInput
                accessibilityLabel={`Split line ${index + 1} amount`}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={line.amount}
                onChangeText={value => updateLine(index, {amount: value})}
              />
              <AppTextInput
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
        {data.splits.length > 0 && (
          <>
            <SectionTitle title="Recent split entries" />
            {data.splits.slice(0, 20).map(split => {
              const parentEntry = data.money.find(entry => entry.id === split.parentEntryId);
              return parentEntry ? (
                <View key={split.id} style={styles.listRow}>
                  <View style={styles.listBody}>
                    <Text style={styles.listTitle}>{split.lines.map(line => line.category).join(' + ')}</Text>
                    <Text style={styles.listMeta}>{[parentEntry.note || formatDate(parentEntry.occurredAt), formatMoney(parentEntry.amountMinor, parentEntry.currency)].join(' · ')}</Text>
                  </View>
                  <MenuActions accessibilityLabel={`Manage split entry ${split.id}`} actions={[{label: 'Delete', danger: true, onPress: () => deleteMoney(parentEntry.id)}]} />
                </View>
              ) : null;
            })}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyTransferScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {colors, styles} = useThemeStyles();
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
        <SecondaryHeader title="Transfer money" backLabel="Money" onBack={onBack} />
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
            <AppTextInput
              accessibilityLabel="Transfer amount"
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.formLabel}>Note (optional)</Text>
            <AppTextInput
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
  const {styles} = useThemeStyles();
  const fromName = accounts.find(account => account.id === transfer.fromAccountId)?.name ?? 'Unknown account';
  const toName = accounts.find(account => account.id === transfer.toAccountId)?.name ?? 'Unknown account';
  return (
    <View style={styles.listRow}>
      <View style={styles.listBody}>
        <Text style={styles.listTitle}>{fromName} to {toName}</Text>
        <Text style={styles.listMeta}>{[transfer.note || formatDate(transfer.occurredAt), formatMoney(transfer.amountMinor, transfer.currency)].join(' · ')}</Text>
      </View>
      <MenuActions accessibilityLabel={`Manage transfer from ${fromName} to ${toName}`} actions={[{label: 'Delete', danger: true, onPress: onDelete}]} />
    </View>
  );
}

export function MoneyReportScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {colors, styles} = useThemeStyles();
  const [period, setPeriod] = useState<MoneyRangePeriod>('month');
  const [customStart, setCustomStart] = useState(localDateKey(new Date()));
  const [customEnd, setCustomEnd] = useState(localDateKey(new Date()));
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [kind, setKind] = useState<MoneyReportFilter['kind']>(emptyMoneyReportFilter.kind);
  const [categoryId, setCategoryId] = useState<string | 'all'>(emptyMoneyReportFilter.categoryId);
  const [accountId, setAccountId] = useState<string | 'all'>(emptyMoneyReportFilter.accountId);
  const [reportFiltersOpen, setReportFiltersOpen] = useState(false);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  useAndroidBack(periodMenuOpen, 100, () => setPeriodMenuOpen(false));
  let range: ReturnType<typeof getMoneyRange> = null;
  let rangeError: string | null = null;
  try {
    range = getMoneyRange(new Date(), period === 'custom'
      ? {period: 'custom', startLocalDate: customStart, endLocalDate: customEnd}
      : {period}, data.weekStartsOn);
  } catch (error) {
    rangeError = error instanceof Error ? error.message : 'Choose a valid report interval.';
  }
  const activeAccounts = data.accounts.filter(account => !account.isArchived);
  const hasAccountChoice = activeAccounts.length > 1;
  const effectiveAccountId = hasAccountChoice ? accountId : 'all';
  const filter: MoneyReportFilter = {kind, categoryId, accountId: effectiveAccountId};
  const report = range === null ? null : buildMoneyReport(data.money, range, data.splits, filter);
  const filterCategories = data.categories.filter(category => !category.isArchived || category.id === categoryId);
  const filterAccounts = data.accounts.filter(account => !account.isArchived || account.id === effectiveAccountId);
  const kindLabel = kind === 'all' ? 'All types' : kind === 'expense' ? 'Expenses' : 'Income';
  const categoryLabel = categoryId === 'all' ? 'All categories' : data.categories.find(category => category.id === categoryId)?.name ?? 'Selected category';
  const accountLabel = effectiveAccountId === 'all' ? 'All accounts' : data.accounts.find(account => account.id === effectiveAccountId)?.name ?? 'Selected account';
  const activeReportFilterLabels = [
    kind !== 'all' ? kindLabel : null,
    categoryId !== 'all' ? categoryLabel : null,
    effectiveAccountId !== 'all' ? accountLabel : null,
  ].filter(Boolean);
  const reportRangeLabel = period === 'custom'
    ? range
      ? `${formatPeriodRange(range)} (end excluded)`
      : 'Invalid custom interval'
    : range
      ? formatPeriodRange(range)
      : 'Invalid custom interval';

  async function pickCustomDate(which: 'start' | 'end') {
    try {
      const current = which === 'start' ? customStart : customEnd;
      const selected = await dateTimePicker.pickDate(current);
      if (!selected) return;
      setPickerError(null);
      if (which === 'start') {
        setCustomStart(selected);
      } else {
        setCustomEnd(selected);
      }
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : 'The report date picker failed.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SecondaryHeader title="Money report" backLabel="Money" onBack={onBack} />
      <Menu
        visible={periodMenuOpen}
        onDismiss={() => setPeriodMenuOpen(false)}
        anchor={
          <Button mode="outlined" icon="calendar-range" accessibilityLabel="Choose report period" style={styles.fullWidthControl} contentStyle={styles.fullWidthControlContent} onPress={() => setPeriodMenuOpen(true)}>
            {moneyRangePeriodLabel(period)}
          </Button>
        }>
        {(['day', 'week', 'month', 'year', 'custom'] as MoneyRangePeriod[]).map(option => (
          <Menu.Item key={option} title={moneyRangePeriodLabel(option)} leadingIcon={period === option ? 'check' : undefined} onPress={() => {setPeriod(option); setPeriodMenuOpen(false);}} />
        ))}
      </Menu>
      <Text style={styles.pageIntro}>{reportRangeLabel}</Text>
      {period === 'custom' && (
        <View style={styles.inlinePanel}>
          <Text style={styles.cardDetail}>Start is included; end is excluded.</Text>
          {dateTimePicker.isSupported() ? <>
            <TextButton label={`Start: ${formatLocalDate(customStart)}`} onPress={() => void pickCustomDate('start')} />
            <TextButton label={`End: ${formatLocalDate(customEnd)}`} onPress={() => void pickCustomDate('end')} />
          </> : <>
            <AppTextInput accessibilityLabel="Report start date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={customStart} onChangeText={setCustomStart} />
            <AppTextInput accessibilityLabel="Report end date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={customEnd} onChangeText={setCustomEnd} />
          </>}
        </View>
      )}
      {pickerError && <Text style={styles.errorText}>{pickerError}</Text>}
      <Disclosure
        title="Report filters"
        subtitle={activeReportFilterLabels.length > 0 ? activeReportFilterLabels.join(' · ') : undefined}
        open={reportFiltersOpen}
        onPress={() => setReportFiltersOpen(current => !current)}>
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
        {hasAccountChoice && (
          <>
            <Text style={styles.formLabel}>Account</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="All" selected={accountId === 'all'} onPress={() => setAccountId('all')} />
              {filterAccounts.map(account => (
                <ChipButton key={account.id} label={account.name} selected={accountId === account.id} onPress={() => setAccountId(account.id)} />
              ))}
            </View>
          </>
        )}
      </Disclosure>
      {rangeError ? (
        <EmptyState text={rangeError} />
      ) : !report || report.currencies.length === 0 ? (
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
              <View key={category.name} style={styles.metricRow}>
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

function AppTimeScreen({onBack, onOpenSettings}: {onBack: () => void; onOpenSettings: () => void}) {
  const {styles} = useThemeStyles();
  const {data, setUsagePermission, replaceUsageSnapshots} = useAppStore();
  const [permission, setPermission] = useState(data?.usageRead.permission ?? 'unknown');
  const [isChecking, setIsChecking] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [usagePeriod, setUsagePeriod] = useState<Period>('day');
  const [focusToolsOpen, setFocusToolsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const permissionRequest = useRef(0);
  const permissionMounted = useRef(true);
  const checkPermission = useCallback(async () => {
    const request = ++permissionRequest.current;
    const isCurrent = () => permissionMounted.current && request === permissionRequest.current;
    try {
      const nextPermission = !usageAccess.isSupported() ? 'unsupported' : await usageAccess.hasPermission() ? 'granted' : 'denied';
      if (!isCurrent()) return;
      setPermission(nextPermission);
      await setUsagePermission(nextPermission);
    } catch {
      if (!isCurrent()) return;
      setPermission('denied');
      await setUsagePermission('denied', 'USAGE_ACCESS_CHECK_FAILED');
    } finally {
      if (isCurrent()) setIsChecking(false);
    }
  }, [setUsagePermission]);
  useEffect(() => {
    permissionMounted.current = true;
    void checkPermission();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkPermission();
    });
    return () => {permissionMounted.current = false; subscription.remove();};
  }, [checkPermission]);

  if (!data) return null;
  const currentData = data;

  async function refreshUsage() {
    setIsRefreshing(true);
    const range = getPeriodRange(new Date(), usagePeriod, currentData.weekStartsOn);
    const dayRanges = getLocalDayRanges(range);
    setMessage(`Reading ${periodLabel(usagePeriod).toLowerCase()} app time...`);
    try {
      const sourceReadAt = new Date().toISOString();
      const dailyRecords: Array<{records: UsageRecord[]; rangeStartMillis: number}> = [];
      for (const dayRange of dayRanges) {
        const queryEndMillis = Math.min(dayRange.end.getTime(), Date.now());
        const rawRecords = queryEndMillis > dayRange.start.getTime()
          ? await usageAccess.query(dayRange.start.getTime(), queryEndMillis)
          : [];
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
  const previousRange = previousUsageRange(new Date(), usagePeriod, currentData.weekStartsOn);
  const previousDates = getLocalDateKeys(previousRange);
  const usageMetrics = deriveUsageMetrics({
    snapshots: data.usageSnapshots,
    localDates: periodDates,
    permission,
    previous: {
      snapshots: data.usageSnapshots,
      localDates: previousDates,
      permission,
    },
  });
  const totalSeconds = sumUsage(data.usageSnapshots, periodDates);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TabHeader
        title="App time"
        subtitle={`${periodLabel(usagePeriod)} · ${data.usageRead.lastReadAt ? `read ${formatDate(data.usageRead.lastReadAt)}` : 'not read yet'}`}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />
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
          <View style={styles.formCard}>
            <ChoiceMenu label="Period" value={usagePeriod} options={PERIOD_CHOICES} onSelect={setUsagePeriod} />
          </View>
          <SummaryCard
            title="Usage"
            value={formatDuration(totalSeconds)}
            detail={formatPeriodRange(range)}
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
                <Text style={styles.amount}>{snapshot.included ? formatDuration(snapshot.durationSeconds) : 'Excluded'}</Text>
              </View>
            ))
          )}
          <Disclosure
            title="Analysis"
            subtitle="Derived from included local usage"
            open={analysisOpen}
            onPress={() => setAnalysisOpen(current => !current)}>
          <View style={styles.formCard}>
            <View style={styles.metricRow}><Text style={styles.listTitle}>Daily average</Text><Text style={styles.metricValue}>{formatUsageMetric(usageMetrics.averageSecondsPerLocalDay, formatDuration)}</Text></View>
            <View style={styles.metricRow}><Text style={styles.listTitle}>Active apps</Text><Text style={styles.metricValue}>{formatUsageMetric(usageMetrics.activeAppCount, value => String(value))}</Text></View>
            <View style={styles.metricRow}><Text style={styles.listTitle}>Top-app share</Text><Text style={styles.metricValue}>{formatUsageMetric(usageMetrics.topAppShare, value => `${value.displayName} · ${Math.round(value.share * 100)}%`)}</Text></View>
            <View style={styles.metricRow}><Text style={styles.listTitle}>Busiest day</Text><Text style={styles.metricValue}>{formatUsageMetric(usageMetrics.busiestLocalDay, value => `${formatLocalDate(value.localDate)} · ${formatDuration(value.durationSeconds)}`)}</Text></View>
            <View style={styles.metricRow}><Text style={styles.listTitle}>Previous period</Text><Text style={styles.metricValue}>{formatUsageMetric(usageMetrics.previousEquivalentPeriodChange, value => `${value.deltaSeconds >= 0 ? '+' : ''}${formatDuration(value.deltaSeconds)} · ${value.fraction >= 0 ? '+' : ''}${Math.round(value.fraction * 100)}%`)}</Text></View>
          </View>
          </Disclosure>
        </>
      )}
      <Disclosure
        title="Focus sessions"
        subtitle="Optional manual focus block"
        open={focusToolsOpen}
        onPress={() => setFocusToolsOpen(current => !current)}>
        <FocusSessionPanel data={data} />
      </Disclosure>
    </ScrollView>
  );
}

function FocusSessionPanel({data}: {data: AppData}) {
  const {styles} = useThemeStyles();
  const {startFocusSession, finishFocusSession, deleteFocusSession} = useAppStore();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [appGroupId, setAppGroupId] = useState<string | null>(null);
  const [clockMillis, setClockMillis] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusLinksOpen, setFocusLinksOpen] = useState(false);
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

  function sessionDetail(session: AppData['focusSessions'][number]): string {
    const task = session.taskId ? data.tasks.find(item => item.id === session.taskId)?.title ?? 'Deleted task' : null;
    const project = session.projectId ? data.projects.find(item => item.id === session.projectId)?.name ?? 'Deleted project' : null;
    const note = session.noteId ? data.notes.find(item => item.id === session.noteId)?.title ?? 'Deleted note' : null;
    const group = session.appGroupId ? data.appGroups.find(item => item.id === session.appGroupId)?.name ?? 'Deleted app group' : null;
    return [task, project, note, group].filter(Boolean).join(' · ') || 'No linked records';
  }

  return (
    <View style={styles.inlinePanel}>
      <Text style={styles.cardTitle}>Focus sessions</Text>
      <Text style={styles.cardDetail}>Track one manual focus block locally. It does not block apps.</Text>
      {activeSession ? (
        <>
          <Text style={styles.cardValue}>{formatDuration(focusSessionDurationSeconds(activeSession, new Date(clockMillis).toISOString()))}</Text>
          <Text style={styles.cardDetail}>{sessionDetail(activeSession)}</Text>
          <PrimaryButton label="Complete focus" onPress={() => void finish('completed')} />
          <MenuActions actions={[{label: 'Stop focus', danger: true, onPress: () => void finish('manual')}]} accessibilityLabel="More focus actions" />
        </>
      ) : (
        <>
          <Disclosure
            title="Link to records"
            subtitle={[taskId, projectId, noteId, appGroupId].filter(value => value !== null).length > 0 ? 'Links selected' : 'Optional task, project, note, or app group'}
            open={focusLinksOpen}
            compact
            onPress={() => setFocusLinksOpen(current => !current)}>
            <Text style={styles.formLabel}>Task (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No task" selected={taskId === null} onPress={() => setTaskId(null)} />
              {data.tasks.slice(0, 12).map(task => <ChipButton key={task.id} label={task.title} selected={taskId === task.id} onPress={() => setTaskId(task.id)} />)}
            </View>
            <Text style={styles.formLabel}>Project (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No project" selected={projectId === null} onPress={() => setProjectId(null)} />
              {data.projects.filter(project => !project.isArchived).map(project => <ChipButton key={project.id} label={project.name} selected={projectId === project.id} onPress={() => setProjectId(project.id)} />)}
            </View>
            <Text style={styles.formLabel}>Note (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No note" selected={noteId === null} onPress={() => setNoteId(null)} />
              {data.notes.filter(note => !note.isArchived).slice(0, 12).map(note => <ChipButton key={note.id} label={note.title} selected={noteId === note.id} onPress={() => setNoteId(note.id)} />)}
            </View>
            <Text style={styles.formLabel}>App group (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No app group" selected={appGroupId === null} onPress={() => setAppGroupId(null)} />
              {data.appGroups.filter(group => !group.isArchived).map(group => <ChipButton key={group.id} label={group.name} selected={appGroupId === group.id} onPress={() => setAppGroupId(group.id)} />)}
            </View>
          </Disclosure>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {message && <Text style={styles.successText}>{message}</Text>}
          <PrimaryButton label="Start focus session" onPress={() => void start()} />
        </>
      )}
      {!activeSession && data.focusSessions.length === 0 && <Text style={styles.emptyState}>No focus sessions yet.</Text>}
      {data.focusSessions.length > 0 && (
        <DeferredSection title="Recent sessions" subtitle="View saved focus blocks">
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
        </DeferredSection>
      )}
    </View>
  );
}

type NotesFilter = 'all' | 'pinned' | 'archived';

function NotesScreen({focusNoteId, openAdd, onAddHandled, onFocusHandled, onSecondaryScreenChange, onOpenSettings}: {focusNoteId: string | null; openAdd: boolean; onAddHandled: () => void; onFocusHandled: () => void; onSecondaryScreenChange: (open: boolean) => void; onOpenSettings: () => void}) {
  const {colors, styles} = useThemeStyles();
  const {data, addNote, updateNote, addNoteLink, deleteNoteLink, toggleNotePinned, setNoteArchived, deleteNote, addSavedSearch, deleteSavedSearch, createTaskFromNote, addAttachment, deleteAttachment} = useAppStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bodySelection, setBodySelection] = useState<NoteTextSelection>({start: 0, end: 0});
  const [tags, setTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);
  const [managingNoteId, setManagingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteFilter, setNoteFilter] = useState<NotesFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busySavedSearchId, setBusySavedSearchId] = useState<string | null>(null);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [linkTargetType, setLinkTargetType] = useState<NoteLinkTargetType>('task');
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [linkTargetSearch, setLinkTargetSearch] = useState('');
  useAndroidBack(noteFormOpen || managingNoteId !== null, 30, () => {
    if (saving) return;
    if (noteFormOpen) confirmDiscard(cancelEditing);
    else setManagingNoteId(null);
  });

  useEffect(() => {
    onSecondaryScreenChange(noteFormOpen || managingNoteId !== null);
    return () => onSecondaryScreenChange(false);
  }, [managingNoteId, noteFormOpen, onSecondaryScreenChange]);

  useEffect(() => {
    if (!openAdd) {
      return;
    }
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setBodySelection({start: 0, end: 0});
    setTags('');
    setFormattingOpen(false);
    setError(null);
    setNoteFormOpen(true);
    onAddHandled();
  }, [onAddHandled, openAdd]);

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
    setNoteFormOpen(true);
    setError(null);
    onFocusHandled();
  }, [data, focusNoteId, onFocusHandled]);

  if (!data) {
    return null;
  }
  const currentData = data;

  const attachmentNamesByNoteId = new Map<string, string[]>();
  for (const attachment of data.attachments) {
    const names = attachmentNamesByNoteId.get(attachment.noteId) ?? [];
    names.push(attachment.name);
    attachmentNamesByNoteId.set(attachment.noteId, names);
  }
  const filteredNotes = filterNotes(data.notes, searchQuery, noteFilter === 'archived' || showArchived, attachmentNamesByNoteId);
  const visibleNotes = noteFilter === 'pinned'
    ? filteredNotes.filter(note => note.isPinned && !note.isArchived)
    : noteFilter === 'archived'
      ? filteredNotes.filter(note => note.isArchived)
      : filteredNotes;
  const pinnedNotes = visibleNotes.filter(note => note.isPinned && !note.isArchived).slice(0, 4);
  const recentNotes = (noteFilter === 'all' && pinnedNotes.length > 0 ? visibleNotes.filter(note => !note.isPinned) : visibleNotes).slice(0, 12);

  async function save() {
    const draft = {title: title.trim(), body: body.trim(), tags: normalizeNoteTags(tags)};
    const validationError = validateNoteDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, draft);
      } else {
        await addNote(draft);
      }
      cancelEditing();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setNoteFormOpen(false);
    setTitle('');
    setBody('');
    setBodySelection({start: 0, end: 0});
    setTags('');
    setFormattingOpen(false);
    setError(null);
  }

  function startEditing(note: Note) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setBodySelection({start: note.body.length, end: note.body.length});
    setTags(note.tags.join(', '));
    setNoteFormOpen(true);
    setError(null);
  }

  function startNewNote() {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setBodySelection({start: 0, end: 0});
    setTags('');
    setFormattingOpen(false);
    setError(null);
    setNoteFormOpen(true);
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
    setManagingNoteId(note.id);
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
    setNoteFilter('all');
    setError(null);
  }

  function changeNoteFilter(nextFilter: NotesFilter) {
    setNoteFilter(nextFilter);
    setShowArchived(nextFilter === 'archived');
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

  function renderNoteCard(note: Note) {
    const noteAttachments = currentData.attachments.filter(attachment => attachment.noteId === note.id);
    const noteLinks = currentData.noteLinks.filter(link => link.noteId === note.id);
    const isBusy = busyNoteId === note.id;
    const detailParts = [
      noteAttachments.length > 0 ? `${noteAttachments.length} attachment${noteAttachments.length === 1 ? '' : 's'}` : null,
      noteLinks.length > 0 ? `${noteLinks.length} link${noteLinks.length === 1 ? '' : 's'}` : null,
    ].filter((part): part is string => part !== null);

    return (
      <View key={note.id} style={[styles.noteCard, styles.cardShadow, note.isPinned && styles.noteCardPinned, note.isArchived && styles.noteCardArchived]}>
        <View style={styles.noteCardMenu}>
          <MenuActions
            accessibilityLabel={`Manage note ${note.title}`}
            disabled={isBusy}
            actions={[
              {label: 'Make task', onPress: () => void makeTask(note)},
              {label: note.isPinned ? 'Unpin' : 'Pin', onPress: () => void togglePinned(note)},
              {label: note.isArchived ? 'Restore' : 'Archive', onPress: () => void changeArchived(note)},
              {
                label: linkingNoteId === note.id ? 'Cancel link' : 'Link record',
                onPress: () => linkingNoteId === note.id ? setLinkingNoteId(null) : startLinking(note),
              },
              {
                label: 'Links & attachments',
                onPress: () => setManagingNoteId(note.id),
              },
              {label: 'Delete', danger: true, onPress: () => confirmDeleteNote(note)},
            ]}
          />
        </View>
        <TouchableRipple
          accessibilityRole="button"
          accessibilityLabel={`Open note ${note.title}`}
          style={styles.noteCardPressable}
          onPress={() => startEditing(note)}>
          <View>
            <View style={styles.noteCardTopline}>
              <Text style={styles.noteCategory}>{note.isArchived ? 'Archived' : note.isPinned ? 'Pinned' : note.tags[0] ? `#${note.tags[0]}` : 'Note'}</Text>
            </View>
            <Text style={styles.noteCardTitle} numberOfLines={2}>{note.title}</Text>
            {!!note.body && <NoteBodyPreview body={note.body} />}
            {note.tags.length > 0 && (
              <View style={styles.noteTagRow}>
                {note.tags.slice(0, 4).map(tag => <Text key={tag} style={styles.noteTag}>#{tag}</Text>)}
              </View>
            )}
            <View style={styles.noteCardMetaRow}>
              <Text style={styles.noteCardMeta}>{formatDate(note.updatedAt)}</Text>
              {detailParts.length > 0 && <Text style={styles.noteCardMeta}>{detailParts.join(' - ')}</Text>}
            </View>
          </View>
        </TouchableRipple>
      </View>
    );
  }

  const managingNote = managingNoteId ? currentData.notes.find(note => note.id === managingNoteId) ?? null : null;
  if (managingNote) {
    const noteLinks = currentData.noteLinks.filter(link => link.noteId === managingNote.id);
    const noteAttachments = currentData.attachments.filter(attachment => attachment.noteId === managingNote.id);
    const currentLinkOptions = linkingNoteId === managingNote.id ? noteLinkOptions(linkTargetType, currentData, linkTargetSearch) : [];
    const isBusy = busyNoteId === managingNote.id;
    return (
      <View style={styles.flex}>
        <Appbar.Header mode="small" statusBarHeight={0} style={styles.settingsAppbar}>
          <Appbar.BackAction accessibilityLabel="Back to Notes" onPress={() => {setManagingNoteId(null); setLinkingNoteId(null);}} />
          <Appbar.Content title="Links & attachments" titleStyle={styles.settingsAppbarTitle} />
        </Appbar.Header>
        <ScrollView contentContainerStyle={styles.settingsDetailContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle} numberOfLines={2}>{managingNote.title}</Text>
          <Surface style={styles.formCard} elevation={0}>
            <Text style={styles.cardTitle}>Linked records</Text>
            {noteLinks.length === 0 ? (
              <Text style={styles.cardDetail}>No linked records.</Text>
            ) : noteLinks.map(link => (
              <View key={link.id} style={styles.linkRow}>
                <Text style={styles.listMeta}>{formatNoteLinkTarget(link, currentData)}</Text>
                <MenuActions accessibilityLabel={`Manage link ${link.id}`} disabled={isBusy} actions={[
                  {label: 'Remove', danger: true, onPress: () => void removeNoteLink(link)},
                ]} />
              </View>
            ))}
            <TextButton label={linkingNoteId === managingNote.id ? 'Cancel link' : 'Link record'} disabled={isBusy} onPress={() => linkingNoteId === managingNote.id ? setLinkingNoteId(null) : startLinking(managingNote)} />
            {linkingNoteId === managingNote.id && (
              <View style={styles.linkEditor}>
                <Text style={styles.formLabel}>Link type</Text>
                <View style={styles.chipWrap}>
                  {NOTE_LINK_TARGET_TYPES.map(type => (
                    <ChipButton key={type} label={noteLinkTypeLabel(type)} selected={linkTargetType === type} onPress={() => changeLinkTargetType(type)} />
                  ))}
                </View>
                <AppTextInput
                  accessibilityLabel="Search link targets"
                  placeholder="Search records"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={linkTargetSearch}
                  onChangeText={value => {
                    setLinkTargetSearch(value);
                    setLinkTargetId(noteLinkOptions(linkTargetType, currentData, value)[0]?.id ?? null);
                  }}
                />
                <View style={styles.chipWrap}>
                  {currentLinkOptions.slice(0, 20).map(option => (
                    <ChipButton key={option.id} label={option.label} selected={linkTargetId === option.id} onPress={() => setLinkTargetId(option.id)} />
                  ))}
                </View>
                {currentLinkOptions.length === 0 && <Text style={styles.cardDetail}>No matching records.</Text>}
                <PrimaryButton label="Save link" onPress={() => void saveNoteLink(managingNote)} disabled={isBusy || linkTargetId === null} />
              </View>
            )}
          </Surface>
          <Surface style={styles.formCard} elevation={0}>
            <Text style={styles.cardTitle}>Attachments</Text>
            {noteAttachments.length === 0 ? (
              <Text style={styles.cardDetail}>No attachments.</Text>
            ) : noteAttachments.map(attachment => (
              <View key={attachment.id} style={styles.attachmentRow}>
                <View style={styles.listBody}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                  <Text style={styles.listMeta}>{formatBytes(attachment.byteSize)}</Text>
                </View>
                <MenuActions accessibilityLabel={`Manage attachment ${attachment.name}`} disabled={isBusy} actions={[
                  {label: 'Open', onPress: () => void openNoteAttachment(attachment)},
                  {label: 'Remove', danger: true, onPress: () => void removeNoteAttachment(attachment)},
                ]} />
              </View>
            ))}
            <TextButton label={isBusy ? 'Working...' : 'Add attachment'} disabled={busyNoteId !== null} onPress={() => void addNoteAttachment(managingNote.id)} />
          </Surface>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scrollContent, !noteFormOpen && styles.fabScrollContent]} keyboardShouldPersistTaps="handled">
        <TabHeader
          title="Notes"
          subtitle={noteFormOpen ? editingNoteId ? 'Edit note' : 'New note' : `${data.notes.filter(note => !note.isArchived).length} active · ${data.notes.filter(note => note.isArchived).length} archived`}
          onOpenSettings={onOpenSettings}
        />
        {noteFormOpen && (
          <>
        <View style={styles.formCard}>
          <AppTextInput
            accessibilityLabel="Note title"
            placeholder="A thought worth keeping"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.formLabel}>Body (optional)</Text>
          <AppTextInput
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
          <Disclosure
            title="More note details"
            subtitle={tags.trim() ? 'Tags added' : 'Formatting and tags are optional'}
            open={formattingOpen}
            compact
            onPress={() => setFormattingOpen(current => !current)}>
            <Text style={styles.formLabel}>Formatting</Text>
            <View style={styles.noteMarkupToolbar}>
              <ChipButton label="Bold" selected={false} onPress={() => formatBody('bold')} />
              <ChipButton label="Italic" selected={false} onPress={() => formatBody('italic')} />
              <ChipButton label="Code" selected={false} onPress={() => formatBody('code')} />
              <ChipButton label="Bullet" selected={false} onPress={() => formatBody('bullet')} />
              <ChipButton label="Heading" selected={false} onPress={() => formatBody('heading')} />
            </View>
            <Text style={styles.searchAccessNote}>Formatting is stored as readable text. Plain text still works in search and exports.</Text>
            <Text style={styles.formLabel}>Tags (comma separated, optional)</Text>
            <AppTextInput
              accessibilityLabel="Note tags"
              placeholder="work, idea, project"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={tags}
              onChangeText={setTags}
            />
          </Disclosure>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={saving ? 'Saving...' : editingNoteId ? 'Update note' : 'Save note'} onPress={() => void save()} disabled={saving} />
          <TextButton label="Cancel" onPress={cancelEditing} disabled={saving} />
        </View>
          </>
        )}
        {!noteFormOpen && (
          <>
        <Searchbar
          accessibilityLabel="Search notes"
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClearIconPress={() => setSearchQuery('')}
          style={styles.notesSearchCard}
          inputStyle={styles.notesSearchInput}
        />
        <View style={styles.notesFilterRow}>
          <ChoiceMenu label="Notes view" value={noteFilter} options={[{value: 'all', label: 'All'}, {value: 'pinned', label: 'Pinned'}, {value: 'archived', label: 'Archived'}]} onSelect={changeNoteFilter} />
        </View>
        {searchQuery.trim() && (
          <DeferredSection title="Save this search">
          <View style={styles.notesSaveSearch}>
            <AppTextInput
              accessibilityLabel="Saved search name"
              placeholder="Save this search as..."
              placeholderTextColor={colors.muted}
              style={styles.notesSaveSearchInput}
              value={savedSearchName}
              onChangeText={setSavedSearchName}
            />
            <TextButton label="Save" onPress={() => void saveSearch()} />
          </View>
          </DeferredSection>
        )}
        {data.savedSearches.length > 0 && (
          <Disclosure
            title="Saved searches"
            subtitle={`${data.savedSearches.length} saved`}
            open={savedSearchesOpen}
            onPress={() => setSavedSearchesOpen(current => !current)}>
            {data.savedSearches.map(savedSearch => (
              <View key={savedSearch.id} style={styles.savedSearchRow}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{savedSearch.name}</Text>
                  <Text style={styles.listMeta}>{savedSearch.query}{savedSearch.showArchived ? ' · includes archived' : ''}</Text>
                </View>
                <MenuActions accessibilityLabel={`Manage saved search ${savedSearch.name}`} disabled={busySavedSearchId !== null} actions={[
                  {label: 'Apply', onPress: () => applySavedSearch(savedSearch)},
                  {label: 'Delete', danger: true, onPress: () => confirmDeleteSavedSearch(savedSearch)},
                ]} />
              </View>
            ))}
          </Disclosure>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {data.notes.length === 0 ? (
          <EmptyState text="No notes yet. Tap + to capture one." />
        ) : visibleNotes.length === 0 ? (
          <EmptyState text={searchQuery.trim() ? 'No notes match this search.' : noteFilter === 'pinned' ? 'No pinned notes yet.' : 'No archived notes.'} />
        ) : searchQuery.trim() || noteFilter !== 'all' ? (
          <>
            <SectionTitle title={searchQuery.trim() ? 'Search results' : noteFilter === 'pinned' ? 'Pinned notes' : 'Archived notes'} />
            {visibleNotes.map(renderNoteCard)}
          </>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <View style={styles.notesSection}>
                <View style={styles.notesSectionHeader}>
                  <Text style={styles.notesSectionTitle}>Pinned notes</Text>
                </View>
                {pinnedNotes.map(renderNoteCard)}
              </View>
            )}
            <View style={styles.notesSection}>
              <View style={styles.notesSectionHeader}>
                <Text style={styles.notesSectionTitle}>Recent notes</Text>
              </View>
              {recentNotes.map(renderNoteCard)}
            </View>
          </>
        )}
          </>
        )}
      </ScrollView>
      {!noteFormOpen && <FloatingActionButton label="Add note" onPress={startNewNote} />}
    </KeyboardAvoidingView>
  );
}

function NoteBodyPreview({body}: {body: string}) {
  const {styles} = useThemeStyles();
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

function FloatingActionButton({label, onPress, isOpen = false}: {label: string; onPress: () => void; isOpen?: boolean}) {
  const {styles} = useThemeStyles();
  return (
    <FAB
      accessibilityLabel={label}
      icon={isOpen ? 'close' : 'plus'}
      size="medium"
      style={[styles.fab, styles.cardShadow]}
      onPress={onPress}
    />
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
  const weekday = new Intl.DateTimeFormat(undefined, {weekday: 'long'}).format(new Date(year, month - 1, day));
  return `${weekday}, ${formatLocalDate(localDate)}`;
}

type TaskConfigurationSection = 'dependencies' | 'projects' | 'templates' | 'lists' | 'recurring';

function SettingsGroup({children}: {children: ReactNode}) {
  const {styles} = useThemeStyles();
  return <Surface style={styles.formCard} elevation={0}>{children}</Surface>;
}

function TasksScreen({focusTaskId, focusProjectId, focusTemplateId, focusListId, openAdd, onAddHandled, onTaskFocusHandled, onProjectFocusHandled, onTemplateFocusHandled, onListFocusHandled, onSecondaryScreenChange = () => {}, onOpenSettings, configurationOnly = false, onConfigurationBack = () => {}}: {focusTaskId: string | null; focusProjectId: string | null; focusTemplateId: string | null; focusListId: string | null; openAdd: boolean; onAddHandled: () => void; onTaskFocusHandled: () => void; onProjectFocusHandled: () => void; onTemplateFocusHandled: () => void; onListFocusHandled: () => void; onSecondaryScreenChange?: (open: boolean) => void; onOpenSettings: () => void; configurationOnly?: boolean; onConfigurationBack?: () => void}) {
  const {colors, styles} = useThemeStyles();
  const {data, addProject, updateProject, setProjectArchived, deleteProject, addTaskTemplate, updateTaskTemplate, setTaskTemplateArchived, deleteTaskTemplate, createTaskFromTemplate, addTask, updateTask, moveTask, deleteTask, setTaskReminder, deleteTaskReminder, toggleTask, addTaskList, updateTaskList, setTaskListArchived, deleteTaskList, addTaskRecurrence, setTaskRecurrencePaused, deleteTaskRecurrence, addTaskDependency, deleteTaskDependency} = useAppStore();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueLocalDate, setDueLocalDate] = useState('');
  const [reminderAtLocalDateTime, setReminderAtLocalDateTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [listId, setListId] = useState(TASK_INBOX_LIST_ID);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [taskFiltersOpen, setTaskFiltersOpen] = useState(false);
  const [taskScopeMenuOpen, setTaskScopeMenuOpen] = useState(false);
  useAndroidBack(taskScopeMenuOpen, 100, () => setTaskScopeMenuOpen(false));
  const [configurationSection, setConfigurationSection] = useState<TaskConfigurationSection | null>(null);
  useAndroidBack(taskFormOpen || configurationSection !== null, 30, () => {
    if (saving) return;
    if (taskFormOpen) confirmDiscard(resetForm);
    else setConfigurationSection(null);
  });
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('manual');
  const [showAgenda, setShowAgenda] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
  const [dependencySourceTaskId, setDependencySourceTaskId] = useState<string | null>(null);
  const [dependencyDependentTaskId, setDependencyDependentTaskId] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [busyDependencyId, setBusyDependencyId] = useState<string | null>(null);

  useEffect(() => {
    onSecondaryScreenChange(!configurationOnly && taskFormOpen);
    return () => onSecondaryScreenChange(false);
  }, [configurationOnly, onSecondaryScreenChange, taskFormOpen]);

  useEffect(() => {
    if (!openAdd) {
      return;
    }
    setTitle('');
    setDetails('');
    setDueLocalDate('');
    setReminderAtLocalDateTime('');
    setPriority('normal');
    setListId(TASK_INBOX_LIST_ID);
    setProjectId(null);
    setParentTaskId(null);
    setEditingTaskId(null);
    setTaskDetailsOpen(false);
    setError(null);
    setTaskFormOpen(true);
    onAddHandled();
  }, [onAddHandled, openAdd]);

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
    setTaskFormOpen(true);
    setTaskDetailsOpen(true);
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
    setConfigurationSection('projects');
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
    setConfigurationSection('templates');
    setTemplateError(null);
    setTemplateMessage(null);
    onTemplateFocusHandled();
  }, [data, focusTemplateId, onTemplateFocusHandled]);

  useEffect(() => {
    if (!focusListId || !data) {
      return;
    }
    const taskList = data.taskLists.find(item => item.id === focusListId);
    if (!taskList) {
      onListFocusHandled();
      return;
    }
    setEditingListId(taskList.id);
    setEditingListName(taskList.name);
    setConfigurationSection('lists');
    setTaskListError(null);
    onListFocusHandled();
  }, [data, focusListId, onListFocusHandled]);

  if (!data) {
    return null;
  }

  const currentData = data;
  const configurationTitle = configurationSection === null
    ? 'Task organization'
    : configurationSection === 'dependencies'
      ? 'Dependencies'
      : configurationSection === 'projects'
        ? 'Projects'
        : configurationSection === 'templates'
          ? 'Templates'
          : configurationSection === 'lists'
            ? 'Lists'
            : 'Recurring tasks';
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
  const todayTasks = sortTasks(currentData.tasks.filter(task => task.dueLocalDate === todayLocalDate), 'due');
  const upcomingTasks = sortTasks(currentData.tasks.filter(task => task.status === 'open' && task.dueLocalDate !== null && task.dueLocalDate > todayLocalDate), 'due');
  const noDateTasks = sortTasks(currentData.tasks.filter(task => task.status === 'open' && task.dueLocalDate === null), taskSort);
  const completedThisWeek = currentData.tasks.filter(task => task.status === 'completed' && isInPeriod(task.updatedAt, getPeriodRange(new Date(), 'week', currentData.weekStartsOn))).length;
  async function pickTaskDueDate() {
    try {
      const selected = await dateTimePicker.pickDate(dueLocalDate || todayLocalDate);
      if (selected) {
        setDueLocalDate(selected);
      }
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'The task date picker failed.');
    }
  }

  async function pickTaskReminder() {
    try {
      const currentDate = reminderAtLocalDateTime.slice(0, 10) || dueLocalDate || todayLocalDate;
      const currentTime = reminderAtLocalDateTime.slice(11, 16) || '09:00';
      const selectedDate = await dateTimePicker.pickDate(currentDate);
      if (!selectedDate) return;
      const selectedTime = await dateTimePicker.pickTime(currentTime);
      if (selectedTime) {
        setReminderAtLocalDateTime(`${selectedDate}T${selectedTime}`);
      }
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'The task reminder picker failed.');
    }
  }

  async function pickRecurringRuleDate() {
    try {
      const selected = await dateTimePicker.pickDate(ruleNextDate || todayLocalDate);
      if (selected) setRuleNextDate(selected);
    } catch (pickerError) {
      setTaskRecurrenceError(pickerError instanceof Error ? pickerError.message : 'The recurring-task date picker failed.');
    }
  }

  async function pickRecurringRuleTime() {
    try {
      const selected = await dateTimePicker.pickTime(ruleReminderLocalTime || '09:00');
      if (selected) setRuleReminderLocalTime(selected);
    } catch (pickerError) {
      setTaskRecurrenceError(pickerError instanceof Error ? pickerError.message : 'The recurring-task time picker failed.');
    }
  }

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
    setTaskFormOpen(false);
    setTaskDetailsOpen(false);
    setError(null);
  }

  function startNewTask() {
    setTitle('');
    setDetails('');
    setDueLocalDate('');
    setReminderAtLocalDateTime('');
    setPriority('normal');
    setListId(currentData.taskLists.find(taskList => taskList.id === TASK_INBOX_LIST_ID)?.id ?? currentData.taskLists[0]?.id ?? TASK_INBOX_LIST_ID);
    setProjectId(null);
    setParentTaskId(null);
    setEditingTaskId(null);
    setTaskDetailsOpen(false);
    setError(null);
    setTaskFormOpen(true);
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
    setTaskFormOpen(true);
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
    setSaving(true);
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
    } finally {
      setSaving(false);
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
        <TouchableRipple accessibilityLabel={task.status === 'open' ? `Complete ${task.title}` : `Reopen ${task.title}`} accessibilityRole="button" style={styles.taskToggle} onPress={() => void toggleTaskFromList(task.id)}>
          <View style={styles.touchableRowContent}>
          <View style={[styles.checkbox, task.status === 'completed' && styles.checkboxDone]}>
            {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.listBody}>
            <Text style={[styles.listTitle, task.status === 'completed' && styles.completedText]}>{task.title}</Text>
            {!!task.details && <Text style={styles.listMeta} numberOfLines={1}>{task.details}</Text>}
            <Text style={styles.listMeta}>{[task.priority, taskList?.name ?? 'Deleted list', project?.name ?? (task.projectId === null ? null : 'Deleted project'), task.parentTaskId === null ? null : `Subtask of ${currentData.tasks.find(parent => parent.id === task.parentTaskId)?.title ?? 'Deleted task'}`, subtaskCount > 0 ? `${subtaskCount} subtasks` : null, task.dueLocalDate ? `Due ${formatLocalDate(task.dueLocalDate)}` : 'No due date', task.reminderAtMillis !== null ? `Reminder ${formatLocalDateTime(formatTaskReminderLocalDateTime(task.reminderAtMillis))}` : null].filter(Boolean).join(' · ')}</Text>
            {sourceLabel && <Text style={styles.listMeta}>{sourceLabel}</Text>}
            {getBlockingTaskIds(task.id, currentData.tasks, currentData.taskDependencies).map(blockingTaskId => {
              const blockingTask = currentData.tasks.find(item => item.id === blockingTaskId);
              return blockingTask ? <Text key={blockingTaskId} style={styles.warningText}>Blocked by {blockingTask.title}</Text> : null;
            })}
          </View>
          </View>
        </TouchableRipple>
        <MenuActions accessibilityLabel={`Manage ${task.title}`} disabled={busyTaskId !== null} actions={[
          ...(allowManualMove ? [
            {label: 'Move up', onPress: () => void moveTaskFromList(task.id, 'up')},
            {label: 'Move down', onPress: () => void moveTaskFromList(task.id, 'down')},
          ] : []),
          ...(task.dueLocalDate ? [{label: 'Calendar', onPress: () => void addTaskToCalendar(task)}] : []),
          {label: 'Edit', onPress: () => startEditing(task)},
          {label: 'Delete', danger: true, onPress: () => confirmDelete(task)},
        ]} />
      </View>
    );
  }

  function renderCompactTaskRow(task: Task, allowManualMove: boolean) {
    const taskList = currentData.taskLists.find(taskListItem => taskListItem.id === task.listId);
    const project = task.projectId === null ? null : currentData.projects.find(projectItem => projectItem.id === task.projectId);
    const subtaskCount = subtaskCountByParent.get(task.id) ?? 0;
    const sourceLabel = getTaskSourceLabel(task, currentData.notes);
    const dueLabel = task.dueLocalDate === todayLocalDate ? 'Today' : task.dueLocalDate ? formatLocalDate(task.dueLocalDate) : null;
    return (
      <View key={task.id} style={[styles.taskCard, styles.cardShadow, task.status === 'completed' && styles.taskCardCompleted]}>
        <View style={styles.taskCardMain}>
          <TouchableRipple accessibilityLabel={task.status === 'open' ? `Complete ${task.title}` : `Reopen ${task.title}`} accessibilityRole="button" style={styles.taskCheckButton} onPress={() => void toggleTaskFromList(task.id)}>
            <View style={[styles.checkbox, task.status === 'completed' && styles.checkboxDone]}>
              {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableRipple>
          <TouchableRipple accessibilityLabel={`Open ${task.title}`} accessibilityRole="button" style={styles.taskContentButton} onPress={() => startEditing(task)}>
            <View>
            <Text style={[styles.taskCardTitle, task.status === 'completed' && styles.completedText]} numberOfLines={2}>{task.title}</Text>
            <View style={styles.taskMetaRow}>
              {dueLabel && <Text style={styles.taskDueMeta}>{dueLabel}</Text>}
              {taskList && <Text style={styles.taskMetaAccent}>{taskList.name}</Text>}
              {project && <Text style={styles.taskMetaAccent}>{project.name}</Text>}
              {subtaskCount > 0 && <Text style={styles.taskMeta}>{`${subtaskCount} subtasks`}</Text>}
            </View>
            {sourceLabel && <Text style={styles.taskMeta} numberOfLines={1}>{sourceLabel}</Text>}
            {getBlockingTaskIds(task.id, currentData.tasks, currentData.taskDependencies).map(blockingTaskId => {
              const blockingTask = currentData.tasks.find(item => item.id === blockingTaskId);
              return blockingTask ? <Text key={blockingTaskId} style={styles.warningText}>Blocked by {blockingTask.title}</Text> : null;
            })}
            </View>
          </TouchableRipple>
          <View style={styles.taskCardRight}>
            <Text style={task.priority === 'high' ? styles.taskPriorityHigh : styles.taskPriorityNormal}>{task.priority === 'high' ? '★' : '☆'}</Text>
            <MenuActions accessibilityLabel={`Manage ${task.title}`} disabled={busyTaskId !== null} actions={[
              ...(allowManualMove ? [
                {label: 'Move up', onPress: () => void moveTaskFromList(task.id, 'up')},
                {label: 'Move down', onPress: () => void moveTaskFromList(task.id, 'down')},
              ] : []),
              ...(task.dueLocalDate ? [{label: 'Calendar', onPress: () => void addTaskToCalendar(task)}] : []),
              {label: 'Delete', danger: true, onPress: () => confirmDelete(task)},
            ]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {configurationOnly && (
        <Appbar.Header mode="small" statusBarHeight={0} style={styles.settingsAppbar}>
          <Appbar.BackAction
            accessibilityLabel={configurationSection === null ? 'Back to Settings' : 'Back to categories'}
            onPress={configurationSection === null ? onConfigurationBack : () => setConfigurationSection(null)}
          />
          <Appbar.Content title={configurationTitle} titleStyle={styles.settingsAppbarTitle} />
        </Appbar.Header>
      )}
      <ScrollView contentContainerStyle={configurationOnly ? styles.settingsDetailContent : [styles.scrollContent, !taskFormOpen && styles.fabScrollContent]} keyboardShouldPersistTaps="handled">
        {!configurationOnly && <TabHeader
          title="Tasks"
          subtitle={taskFormOpen ? editingTaskId ? 'Edit task' : 'New task' : `${currentData.tasks.filter(task => task.status === 'open').length} open · ${completedThisWeek} completed this week`}
          onOpenSettings={onOpenSettings}
        />}
        {!configurationOnly && taskFormOpen && (
          <>
        <View style={styles.formCard}>
          <AppTextInput accessibilityLabel="Task title" placeholder="What needs doing?" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
          <Disclosure
            title="Task details"
            subtitle={dueLocalDate ? `Due ${formatLocalDate(dueLocalDate)}` : 'Optional details, date, priority, and links'}
            open={taskDetailsOpen}
            compact
            onPress={() => setTaskDetailsOpen(current => !current)}>
            <Text style={styles.formLabel}>Details (optional)</Text>
            <AppTextInput accessibilityLabel="Task details" placeholder="Add context..." placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={details} onChangeText={setDetails} multiline />
            <Text style={styles.formLabel}>Due date (optional)</Text>
            {dateTimePicker.isSupported() ? <>
              <Text style={styles.cardDetail}>{dueLocalDate ? formatLocalDate(dueLocalDate) : 'No due date'}</Text>
              <TextButton label={dueLocalDate ? 'Change due date' : 'Choose due date'} onPress={() => void pickTaskDueDate()} />
            </> : <AppTextInput accessibilityLabel="Task due date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={dueLocalDate} onChangeText={setDueLocalDate} />}
            {dueLocalDate && <TextButton label="Clear due date" onPress={() => setDueLocalDate('')} />}
            <Text style={styles.formLabel}>Reminder (optional)</Text>
            {dateTimePicker.isSupported() ? <>
              <Text style={styles.cardDetail}>{reminderAtLocalDateTime ? formatLocalDateTime(reminderAtLocalDateTime) : 'No reminder'}</Text>
              <TextButton label={reminderAtLocalDateTime ? 'Change reminder' : 'Choose reminder'} onPress={() => void pickTaskReminder()} />
            </> : <AppTextInput accessibilityLabel="Task reminder local date and time" placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.muted} style={styles.input} value={reminderAtLocalDateTime} onChangeText={setReminderAtLocalDateTime} />}
            {reminderAtLocalDateTime && <TextButton label="Clear reminder" onPress={() => setReminderAtLocalDateTime('')} />}
            <Text style={styles.formLabel}>Priority</Text>
            <View style={styles.segmentRow}>
              <SegmentButton label="Low" selected={priority === 'low'} onPress={() => setPriority('low')} />
              <SegmentButton label="Normal" selected={priority === 'normal'} onPress={() => setPriority('normal')} />
              <SegmentButton label="High" selected={priority === 'high'} onPress={() => setPriority('high')} />
            </View>
            <Text style={styles.formLabel}>List</Text>
            <View style={styles.chipWrap}>
              {data.taskLists.filter(taskList => !taskList.isArchived).map(taskList => (
                <ChipButton key={taskList.id} label={taskList.name} selected={listId === taskList.id} onPress={() => setListId(taskList.id)} />
              ))}
            </View>
            <Text style={styles.formLabel}>Project (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No project" selected={projectId === null} onPress={() => setProjectId(null)} />
              {data.projects.filter(project => !project.isArchived || project.id === projectId).map(project => (
                <ChipButton key={project.id} label={project.name} selected={projectId === project.id} onPress={() => setProjectId(project.id)} />
              ))}
            </View>
            <Text style={styles.formLabel}>Parent task (optional)</Text>
            <View style={styles.chipWrap}>
              <ChipButton label="No parent" selected={parentTaskId === null} onPress={() => setParentTaskId(null)} />
              {currentData.tasks.filter(task => task.id !== editingTaskId && task.listId === listId).map(task => (
                <ChipButton key={task.id} label={task.title} selected={parentTaskId === task.id} onPress={() => setParentTaskId(task.id)} />
              ))}
            </View>
          </Disclosure>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label={saving ? 'Saving...' : editingTaskId ? 'Update task' : 'Save task'} onPress={() => void save()} disabled={saving} />
          <TextButton label={editingTaskId ? 'Cancel edit' : 'Cancel'} onPress={resetForm} disabled={saving} />
        </View>
          </>
        )}
        {!configurationOnly && !taskFormOpen && (
          <>
        <Menu
          visible={taskScopeMenuOpen}
          onDismiss={() => setTaskScopeMenuOpen(false)}
          anchor={
            <Button mode="outlined" icon="filter-variant" accessibilityLabel="Choose task scope" style={styles.fullWidthControl} contentStyle={styles.fullWidthControlContent} onPress={() => setTaskScopeMenuOpen(true)}>
              {filter === 'all' ? 'All tasks' : filter === 'today' ? 'Today' : filter === 'upcoming' ? 'Upcoming' : filter === 'completed' ? 'Completed' : 'Overdue'}
            </Button>
          }>
          {(['all', 'today', 'upcoming', 'completed'] as TaskFilter[]).map(option => (
            <Menu.Item key={option} title={option === 'all' ? 'All tasks' : option[0].toUpperCase() + option.slice(1)} leadingIcon={filter === option ? 'check' : undefined} onPress={() => {setFilter(option); setShowAgenda(false); setTaskScopeMenuOpen(false);}} />
          ))}
        </Menu>
        <Disclosure
          title="View and sort"
          subtitle={showAgenda || taskSort !== 'manual' ? `${showAgenda ? 'Agenda' : 'List'} · ${taskSort === 'manual' ? 'Manual order' : taskSort === 'due' ? 'Due date' : 'Priority'}` : undefined}
          open={taskFiltersOpen}
          onPress={() => setTaskFiltersOpen(current => !current)}>
          <Text style={styles.formLabel}>View</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="List" selected={!showAgenda} onPress={() => setShowAgenda(false)} />
            <SegmentButton label="Agenda" selected={showAgenda} onPress={() => setShowAgenda(true)} />
          </View>
          <Text style={styles.formLabel}>Sort</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Manual" selected={taskSort === 'manual'} onPress={() => setTaskSort('manual')} />
            <SegmentButton label="Due date" selected={taskSort === 'due'} onPress={() => setTaskSort('due')} />
            <SegmentButton label="Priority" selected={taskSort === 'priority'} onPress={() => setTaskSort('priority')} />
          </View>
        </Disclosure>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {showAgenda ? (
          <View style={styles.taskSection}>
            <View style={styles.taskSectionHeader}>
              <Text style={styles.taskSectionTitle}>Agenda</Text>
              <Text style={styles.taskSectionMeta}>14 days</Text>
            </View>
            <Text style={styles.taskSectionIntro}>Dated open tasks in the next two weeks.</Text>
            {agendaDays.length === 0 ? (
              <EmptyState text="No dated tasks in the next 14 days." />
            ) : agendaDays.map(day => (
              <View key={day.localDate}>
                <Text style={styles.taskAgendaDay}>{formatTaskAgendaDay(day.localDate, todayLocalDate)}</Text>
                {day.tasks.map(task => renderTaskRow(task, false))}
              </View>
            ))}
          </View>
        ) : filter === 'all' && currentData.tasks.filter(task => task.status === 'open').length === 0 ? (
          <EmptyState text="No open tasks." />
        ) : filter === 'all' ? (
          <>
            <View style={styles.taskSection}>
              <View style={styles.taskSectionHeader}>
                <View style={styles.taskSectionTitleRow}>
                  <Text style={styles.taskSectionTitle}>Today</Text>
                  <Text style={styles.taskCountBadge}>{todayTasks.length}</Text>
                </View>
              </View>
              {todayTasks.length === 0 ? <EmptyState text="Nothing due today." /> : todayTasks.slice(0, 6).map(task => renderCompactTaskRow(task, false))}
              {todayTasks.length > 6 && <TextButton label="View all today" onPress={() => setFilter('today')} />}
            </View>
            <View style={styles.taskSection}>
              <View style={styles.taskSectionHeader}>
                <View style={styles.taskSectionTitleRow}>
                  <Text style={styles.taskSectionTitle}>Upcoming</Text>
                  <Text style={styles.taskCountBadge}>{upcomingTasks.length}</Text>
                </View>
                <TextButton label="Agenda" onPress={() => setShowAgenda(true)} />
              </View>
              {upcomingTasks.length === 0 ? <EmptyState text="No upcoming tasks." /> : upcomingTasks.slice(0, 6).map(task => renderCompactTaskRow(task, false))}
              {upcomingTasks.length > 6 && <TextButton label="View all upcoming" onPress={() => setFilter('upcoming')} />}
            </View>
            {noDateTasks.length > 0 && (
              <View style={styles.taskSection}>
                <View style={styles.taskSectionHeader}>
                  <View style={styles.taskSectionTitleRow}>
                    <Text style={styles.taskSectionTitle}>No due date</Text>
                    <Text style={styles.taskCountBadge}>{noDateTasks.length}</Text>
                  </View>
                </View>
                {noDateTasks.slice(0, 6).map(task => renderCompactTaskRow(task, true))}
                {noDateTasks.length > 6 && <TextButton label="View all tasks" onPress={() => setFilter('all')} />}
              </View>
            )}
          </>
        ) : (
          <View style={styles.taskSection}>
            <View style={styles.taskSectionHeader}>
              <View style={styles.taskSectionTitleRow}>
                <Text style={styles.taskSectionTitle}>{filter === 'today' ? 'Today' : filter === 'upcoming' ? 'Upcoming' : filter === 'completed' ? 'Completed' : 'Overdue'}</Text>
                <Text style={styles.taskCountBadge}>{visibleTasks.length}</Text>
              </View>
            </View>
            {visibleTasks.length === 0 ? <EmptyState text={filter === 'completed' ? 'No completed tasks yet.' : 'No tasks match this view.'} /> : visibleTasks.map(task => renderCompactTaskRow(task, false))}
          </View>
        )}
          </>
        )}
        {configurationOnly && <View style={styles.settingsStack}>
        {configurationSection === null ? (
          <Surface style={styles.settingsList} elevation={0}>
            <View style={styles.settingsListContent}>
              {([
                ['dependencies', 'Dependencies', `${currentData.taskDependencies.length} saved`, 'source-branch'],
                ['projects', 'Projects', `${currentData.projects.length} saved`, 'folder-outline'],
                ['templates', 'Templates', `${currentData.templates.length} saved`, 'file-document-outline'],
                ['lists', 'Lists', `${currentData.taskLists.length} saved`, 'format-list-bulleted'],
                ['recurring', 'Recurring tasks', `${currentData.taskRecurrences.length} saved`, 'repeat'],
              ] as Array<[TaskConfigurationSection, string, string, string]>).map(([section, title, description, icon], index, rows) => (
                <List.Item key={section} accessibilityLabel={`Open ${title}`} title={title} description={description} titleStyle={styles.settingsNavigationTitle} descriptionStyle={styles.settingsNavigationDescription} style={[styles.settingsNavigationRow, index === rows.length - 1 && styles.settingsNavigationRowLast]} left={props => <List.Icon {...props} icon={icon} color={colors.muted} />} right={props => <List.Icon {...props} icon="chevron-right" color={colors.muted} />} onPress={() => setConfigurationSection(section)} />
              ))}
            </View>
          </Surface>
        ) : <>
        {configurationSection === 'dependencies' && <SettingsGroup>
          <DeferredSection title="Add dependency">
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
          <PrimaryButton label={busyDependencyId === 'new' ? 'Saving...' : 'Add dependency'} onPress={() => void saveDependency()} disabled={busyDependencyId !== null || dependencySourceTaskId === null || dependencyDependentTaskId === null} />
          </DeferredSection>
          {dependencyError && <Text style={styles.errorText}>{dependencyError}</Text>}
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
        </SettingsGroup>}
        {configurationSection === 'projects' && <SettingsGroup>
          <DeferredSection title={editingProjectId ? 'Edit project' : 'Add project'} revealKey={editingProjectId}>
          {editingProjectId && <Text style={styles.formLabel}>Edit project</Text>}
          <AppTextInput
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
          <PrimaryButton label={editingProjectId ? 'Update project' : 'Add project'} onPress={() => void saveProject()} />
          {editingProjectId && <TextButton label="Cancel project edit" onPress={resetProjectForm} />}
          </DeferredSection>
          {projectError && <Text style={styles.errorText}>{projectError}</Text>}
          {currentData.projects.length === 0 ? (
            <Text style={styles.cardDetail}>No projects yet.</Text>
          ) : currentData.projects.map(project => (
            <View key={project.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{project.name}</Text>
                <Text style={styles.listMeta}>{project.status === 'completed' ? 'Completed' : 'Active'}{project.isArchived ? ' · Archived' : ''}</Text>
              </View>
              <MenuActions accessibilityLabel={`Manage ${project.name}`} disabled={busyProjectId !== null} actions={[
                {label: project.status === 'completed' ? 'Reopen' : 'Complete', onPress: () => void toggleProjectStatus(project)},
                {label: 'Edit', onPress: () => startEditingProject(project)},
                {label: project.isArchived ? 'Restore' : 'Archive', onPress: () => void toggleProjectArchived(project)},
                {label: 'Delete', danger: true, onPress: () => confirmDeleteProject(project)},
              ]} />
            </View>
          ))}
        </SettingsGroup>}
        {configurationSection === 'templates' && <SettingsGroup>
          <DeferredSection title={editingTemplateId ? 'Edit template' : 'Add template'} revealKey={editingTemplateId}>
          {editingTemplateId && <Text style={styles.formLabel}>Edit template</Text>}
          <AppTextInput accessibilityLabel="Task template name" placeholder="Template name" placeholderTextColor={colors.muted} style={styles.input} value={templateName} onChangeText={setTemplateName} />
          <AppTextInput accessibilityLabel="Task template title" placeholder="Task title" placeholderTextColor={colors.muted} style={styles.input} value={templateTitle} onChangeText={setTemplateTitle} />
          <AppTextInput accessibilityLabel="Task template details" placeholder="Details (optional)" placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={templateDetails} onChangeText={setTemplateDetails} multiline />
          <Text style={styles.formLabel}>Priority</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="Low" selected={templatePriority === 'low'} onPress={() => setTemplatePriority('low')} />
            <SegmentButton label="Normal" selected={templatePriority === 'normal'} onPress={() => setTemplatePriority('normal')} />
            <SegmentButton label="High" selected={templatePriority === 'high'} onPress={() => setTemplatePriority('high')} />
          </View>
          <Text style={styles.formLabel}>List</Text>
          <View style={styles.chipWrap}>
            {currentData.taskLists.filter(taskList => !taskList.isArchived || taskList.id === templateListId).map(taskList => (
              <ChipButton key={taskList.id} label={taskList.name} selected={templateListId === taskList.id} onPress={() => setTemplateListId(taskList.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Project (optional)</Text>
          <View style={styles.chipWrap}>
            <ChipButton label="No project" selected={templateProjectId === null} onPress={() => setTemplateProjectId(null)} />
            {currentData.projects.filter(project => !project.isArchived || project.id === templateProjectId).map(project => (
              <ChipButton key={project.id} label={project.name} selected={templateProjectId === project.id} onPress={() => setTemplateProjectId(project.id)} />
            ))}
          </View>
          <PrimaryButton label={editingTemplateId ? 'Update template' : 'Add template'} onPress={() => void saveTemplate()} />
          {editingTemplateId && <TextButton label="Cancel template edit" onPress={resetTemplateForm} />}
          </DeferredSection>
          {templateError && <Text style={styles.errorText}>{templateError}</Text>}
          {templateMessage && <Text style={styles.successText}>{templateMessage}</Text>}
          {currentData.templates.length === 0 ? (
            <Text style={styles.cardDetail}>No task templates yet.</Text>
          ) : currentData.templates.map(template => (
            <View key={template.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{template.name}</Text>
                <Text style={styles.listMeta}>{template.title} · {template.priority}{template.isArchived ? ' · Archived' : ''}</Text>
              </View>
              <MenuActions accessibilityLabel={`Manage ${template.name}`} disabled={busyTemplateId !== null} actions={[
                ...(!template.isArchived ? [{label: 'Use', onPress: () => void useTemplate(template)}] : []),
                {label: 'Edit', onPress: () => startEditingTemplate(template)},
                {label: template.isArchived ? 'Restore' : 'Archive', onPress: () => void toggleTemplateArchived(template)},
                {label: 'Delete', danger: true, onPress: () => confirmDeleteTemplate(template)},
              ]} />
            </View>
          ))}
        </SettingsGroup>}
        {configurationSection === 'lists' && <SettingsGroup>
          <DeferredSection title={editingListId ? 'Rename list' : 'Add list'} revealKey={editingListId}>
          {editingListId && <Text style={styles.formLabel}>Rename list</Text>}
          <AppTextInput
            accessibilityLabel="Task list name"
            placeholder="New list name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={editingListId ? editingListName : newListName}
            onChangeText={editingListId ? setEditingListName : setNewListName}
          />
          <PrimaryButton label={editingListId ? 'Rename list' : 'Add list'} onPress={() => void saveList()} />
          {editingListId && <TextButton label="Cancel rename" onPress={resetListForm} />}
          </DeferredSection>
          {taskListError && <Text style={styles.errorText}>{taskListError}</Text>}
          {currentData.taskLists.map(taskList => (
            <View key={taskList.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{taskList.name}</Text>
                <Text style={styles.listMeta}>{taskList.isArchived ? 'Archived' : 'Active'}{taskList.id === TASK_INBOX_LIST_ID ? ' · Default' : ''}</Text>
              </View>
              <MenuActions accessibilityLabel={`Manage ${taskList.name}`} disabled={busyListId !== null} actions={[
                {label: 'Rename', onPress: () => startEditingList(taskList)},
                {label: taskList.isArchived ? 'Restore' : 'Archive', onPress: () => void toggleListArchived(taskList)},
                ...(taskList.id !== TASK_INBOX_LIST_ID ? [{label: 'Delete', danger: true, onPress: () => confirmDeleteList(taskList)}] : []),
              ]} />
            </View>
          ))}
        </SettingsGroup>}
        {configurationSection === 'recurring' && <SettingsGroup>
          <DeferredSection title="Add recurring task">
          <AppTextInput accessibilityLabel="Recurring task title" placeholder="What repeats?" placeholderTextColor={colors.muted} style={styles.input} value={ruleTitle} onChangeText={setRuleTitle} />
          <Text style={styles.formLabel}>Details (optional)</Text>
          <AppTextInput accessibilityLabel="Recurring task details" placeholder="Add context..." placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={ruleDetails} onChangeText={setRuleDetails} multiline />
          <Text style={styles.formLabel}>First due date</Text>
          {dateTimePicker.isSupported() ? <><Text style={styles.cardDetail}>{formatLocalDate(ruleNextDate)}</Text><TextButton label="Choose first due date" onPress={() => void pickRecurringRuleDate()} /></> : <AppTextInput accessibilityLabel="Recurring task first due date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={ruleNextDate} onChangeText={setRuleNextDate} />}
          <Text style={styles.formLabel}>Reminder time (optional)</Text>
          {dateTimePicker.isSupported() ? <><Text style={styles.cardDetail}>{ruleReminderLocalTime || 'No reminder time'}</Text><TextButton label="Choose reminder time" onPress={() => void pickRecurringRuleTime()} /></> : <AppTextInput accessibilityLabel="Recurring task reminder time" placeholder="HH:mm" placeholderTextColor={colors.muted} style={styles.input} value={ruleReminderLocalTime} onChangeText={setRuleReminderLocalTime} />}
          {ruleReminderLocalTime && <TextButton label="Clear reminder time" onPress={() => setRuleReminderLocalTime('')} />}
          <Text style={styles.formLabel}>Repeat every</Text>
          <AppTextInput accessibilityLabel="Recurring task interval" placeholder="1" placeholderTextColor={colors.muted} style={styles.input} value={ruleInterval} onChangeText={setRuleInterval} keyboardType="number-pad" />
          <View style={styles.segmentRow}>
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
          <View style={styles.chipWrap}>
            {data.taskLists.filter(taskList => !taskList.isArchived).map(taskList => (
              <ChipButton key={taskList.id} label={taskList.name} selected={ruleListId === taskList.id} onPress={() => setRuleListId(taskList.id)} />
            ))}
          </View>
          <Text style={styles.formLabel}>Missed occurrences</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="All" selected={rulePolicy === 'all'} onPress={() => setRulePolicy('all')} />
            <SegmentButton label="One" selected={rulePolicy === 'one'} onPress={() => setRulePolicy('one')} />
            <SegmentButton label="Skip" selected={rulePolicy === 'skip'} onPress={() => setRulePolicy('skip')} />
          </View>
          <PrimaryButton label="Add recurring task" onPress={() => void saveRule()} />
          </DeferredSection>
          {taskRecurrenceError && <Text style={styles.errorText}>{taskRecurrenceError}</Text>}
          {currentData.taskRecurrences.map(rule => (
            <View key={rule.id} style={styles.taskListRow}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{rule.title}</Text>
                <Text style={styles.listMeta}>{rule.cadence} every {rule.interval} · next {formatLocalDate(rule.nextOccurrenceLocalDate)} · missed {rule.missedOccurrencePolicy}{rule.reminderLocalTime ? ` · reminder ${rule.reminderLocalTime}` : ''}{rule.isPaused ? ' · Paused' : ''}</Text>
              </View>
              <MenuActions accessibilityLabel={`Manage ${rule.title}`} disabled={busyRuleId !== null} actions={[
                {label: rule.isPaused ? 'Resume' : 'Pause', onPress: () => void toggleRule(rule)},
                {label: 'Delete', danger: true, onPress: () => confirmDeleteRule(rule)},
              ]} />
            </View>
          ))}
        </SettingsGroup>}
        </>}
        </View>}
      </ScrollView>
      {!configurationOnly && !taskFormOpen && <FloatingActionButton label="Add task" onPress={startNewTask} />}
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
  detail?: string;
  action: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const {styles} = useThemeStyles();
  return (
    <Surface elevation={0} style={[styles.summaryCard, disabled && styles.disabledCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {detail && <Text style={styles.cardDetail}>{detail}</Text>}
      <Button
        accessibilityLabel={`${action} ${title}`}
        mode="text"
        compact
        disabled={disabled}
        style={styles.cardAction}
        labelStyle={styles.cardActionText}
        onPress={onPress}>
        {action}
      </Button>
    </Surface>
  );
}

function SectionTitle({title}: {title: string}) {
  const {styles} = useThemeStyles();
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Disclosure({title, subtitle, open, onPress, children, compact = false}: {title: string; subtitle?: string; open: boolean; onPress: () => void; children: ReactNode; compact?: boolean}) {
  const {styles} = useThemeStyles();
  return (
    <Surface elevation={0} style={compact ? styles.compactDisclosure : styles.disclosure}>
      <View style={styles.disclosureClip}>
        <List.Accordion
          accessibilityLabel={`${open ? 'Hide' : 'Show'} ${title}`}
          title={title}
          description={subtitle}
          expanded={open}
          titleStyle={styles.disclosureTitle}
          descriptionStyle={styles.disclosureSubtitle}
          style={[styles.disclosureButton, compact && styles.compactDisclosureButton]}
          onPress={onPress}>
          <View style={[styles.disclosureBody, compact && styles.compactDisclosureBody]}>{children}</View>
        </List.Accordion>
      </View>
    </Surface>
  );
}

function EmptyState({text}: {text: string}) {
  const {styles} = useThemeStyles();
  return <Surface accessibilityRole="summary" elevation={0} style={styles.emptyState}><Text style={styles.emptyStateText}>{text}</Text></Surface>;
}

function AppTextInput({style, placeholder, ...props}: ComponentProps<typeof PaperTextInput>) {
  const {colors} = useThemeStyles();
  return (
    <PaperTextInput
      {...props}
      label={placeholder}
      mode="outlined"
      dense
      outlineColor={colors.border}
      activeOutlineColor={colors.accent}
      textColor={colors.text}
      placeholderTextColor={colors.muted}
      style={style}
    />
  );
}

function PrimaryButton({label, onPress, disabled = false}: {label: string; onPress: () => void; disabled?: boolean}) {
  const {styles} = useThemeStyles();
  return (
    <Button
      accessibilityLabel={label}
      icon={actionIcon(label)}
      mode="contained"
      disabled={disabled}
      style={styles.primaryButton}
      contentStyle={styles.primaryButtonContent}
      labelStyle={styles.primaryButtonText}
      onPress={onPress}>
      {label}
    </Button>
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
  const {colors, styles} = useThemeStyles();
  return (
    <Button
      accessibilityLabel={label}
      icon={actionIcon(label)}
      mode="text"
      compact
      textColor={danger ? colors.danger : colors.accent}
      disabled={disabled}
      style={styles.textButton}
      labelStyle={styles.textButtonText}
      onPress={onPress}>
      {label}
    </Button>
  );
}

function MenuActions({actions, accessibilityLabel, disabled = false}: {actions: Array<{label: string; danger?: boolean; onPress: () => void}>; accessibilityLabel: string; disabled?: boolean}) {
  const {colors} = useThemeStyles();
  const [open, setOpen] = useState(false);
  useAndroidBack(open, 100, () => setOpen(false));
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<IconButton icon="dots-vertical" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={() => setOpen(true)} />}>
      {actions.map(action => (
        <Menu.Item
          key={action.label}
          title={action.label}
          leadingIcon={actionIcon(action.label)}
          titleStyle={action.danger ? {color: colors.danger} : undefined}
          onPress={() => {
            setOpen(false);
            action.onPress();
          }}
        />
      ))}
    </Menu>
  );
}

function ToggleButton({label, value, onPress}: {label: string; value: boolean; onPress: () => void}) {
  const {colors, styles} = useThemeStyles();
  return (
    <TouchableRipple
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{checked: value}}
      style={[styles.toggleRow, value && styles.toggleRowSelected]}
      onPress={onPress}>
      <View style={styles.toggleRowContent}>
        <Checkbox.Android color={value ? colors.accentText : colors.accent} uncheckedColor={colors.muted} status={value ? 'checked' : 'unchecked'} />
        <Text style={[styles.toggleLabel, value && styles.toggleTextSelected]}>{label}</Text>
      </View>
    </TouchableRipple>
  );
}

function SegmentButton({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  const {styles} = useThemeStyles();
  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{selected}}
      icon={selected ? 'check' : undefined}
      mode={selected ? 'contained' : 'outlined'}
      compact
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
      contentStyle={styles.segmentButtonContent}
      labelStyle={[styles.segmentText, selected && styles.segmentTextSelected]}
      onPress={onPress}>
      {label}
    </Button>
  );
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  label = 'Account',
  includeCurrency = false,
}: {
  accounts: AppData['accounts'];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  label?: string;
  includeCurrency?: boolean;
}) {
  if (accounts.length <= 1) {
    return null;
  }
  return <ChoiceMenu label={label} value={selectedAccountId}
    options={accounts.map(account => ({value: account.id, label: includeCurrency ? `${account.name} (${account.currency})` : account.name}))}
    onSelect={onSelect} />;
}

function ChipButton({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  const {colors, styles} = useThemeStyles();
  return (
    <Chip
      accessibilityRole="button"
      accessibilityState={{selected}}
      selected={selected}
      selectedColor={selected ? colors.accentText : colors.muted}
      showSelectedCheck
      compact
      mode="outlined"
      style={[styles.chip, selected && styles.chipSelected]}
      textStyle={[styles.chipText, selected && styles.chipTextSelected]}
      onPress={onPress}>
      {label}
    </Chip>
  );
}

type TabHeaderAction = {label: string; icon: string; onPress: () => void};

export function TabHeader({title, subtitle, actions = [], onBack, onOpenSettings}: {title: string; subtitle: string; actions?: TabHeaderAction[]; onBack?: () => void; onOpenSettings: () => void}) {
  const {styles} = useThemeStyles();
  const [menuOpen, setMenuOpen] = useState(false);
  useAndroidBack(menuOpen, 100, () => setMenuOpen(false));
  return (
    <Appbar.Header mode="small" statusBarHeight={0} style={styles.tabHeader}>
      {onBack && <Appbar.BackAction accessibilityLabel={`Back from ${title}`} onPress={onBack} />}
      <Appbar.Content title={<View><Text style={styles.pageTitle}>{title}</Text><Text style={styles.tabHeaderSubtitle}>{subtitle}</Text></View>} />
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        contentStyle={styles.overflowMenu}
        anchor={
          <Appbar.Action
            icon="dots-vertical"
            accessibilityLabel={`More ${title} options`}
            accessibilityState={{expanded: menuOpen}}
            onPress={() => setMenuOpen(current => !current)}
          />
        }>
          {actions.map(action => (
            <Menu.Item
              key={action.label}
              accessibilityLabel={`Open ${action.label}`}
              leadingIcon={action.icon}
              title={action.label}
              onPress={() => {
                setMenuOpen(false);
                action.onPress();
              }}
            />
          ))}
          <Menu.Item
            accessibilityLabel={`Open ${title} settings`}
            leadingIcon="cog-outline"
            title="Settings"
            onPress={() => {
              setMenuOpen(false);
              onOpenSettings();
            }}
          />
      </Menu>
    </Appbar.Header>
  );
}

function SecondaryHeader({title, backLabel, onBack}: {title: string; backLabel: string; onBack: () => void}) {
  const {styles} = useThemeStyles();
  useAndroidBack(true, 10, onBack);
  return (
    <Appbar.Header mode="small" statusBarHeight={0} style={styles.secondaryHeader}>
      <Appbar.BackAction accessibilityLabel={`Back to ${backLabel}`} onPress={onBack} />
      <Appbar.Content title={title} titleStyle={styles.settingsAppbarTitle} />
    </Appbar.Header>
  );
}

export function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  app: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  content: {flex: 1},
  formActions: {backgroundColor: colors.background, paddingHorizontal: UI_TOKENS.spacing.lg, paddingBottom: UI_TOKENS.spacing.sm},
  scrollContent: {padding: UI_TOKENS.spacing.lg, paddingBottom: UI_TOKENS.spacing.xxl, paddingTop: UI_TOKENS.spacing.lg},
  tabHeader: {backgroundColor: colors.background, marginBottom: -UI_TOKENS.spacing.lg, marginHorizontal: -UI_TOKENS.spacing.lg, minHeight: 80, position: 'relative', transform: [{translateY: -UI_TOKENS.spacing.lg}], zIndex: 2},
  secondaryHeader: {backgroundColor: colors.background, marginHorizontal: -UI_TOKENS.spacing.lg, marginTop: -UI_TOKENS.spacing.lg},
  tabHeaderSubtitle: {color: colors.muted, fontSize: 13},
  pageHeader: {alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between'},
  pageHeaderCopy: {flex: 1, paddingRight: UI_TOKENS.spacing.md},
  pageTitle: {color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4},
  pageIntro: {color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: UI_TOKENS.spacing.xs, marginBottom: UI_TOKENS.spacing.md},
  headerAction: {alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: UI_TOKENS.radius.control, borderWidth: 1, justifyContent: 'center', minHeight: UI_TOKENS.target.touch, paddingHorizontal: UI_TOKENS.spacing.md},
  headerActionText: {color: colors.accent, fontSize: 13, fontWeight: '800'},
  overflowButton: {alignItems: 'center', borderRadius: UI_TOKENS.radius.control, justifyContent: 'center', minHeight: UI_TOKENS.target.touch, minWidth: UI_TOKENS.target.touch},
  overflowIcon: {color: colors.text, fontSize: 30, lineHeight: 32},
  overflowMenu: {alignSelf: 'flex-end', backgroundColor: colors.card, borderColor: colors.border, borderRadius: UI_TOKENS.radius.control, borderWidth: 1, elevation: 4, marginBottom: UI_TOKENS.spacing.sm, marginTop: -UI_TOKENS.spacing.sm, minWidth: 176, shadowColor: colors.shadow, shadowOffset: {height: 3, width: 0}, shadowOpacity: 0.12, shadowRadius: 8},
  overflowMenuItem: {alignItems: 'center', flexDirection: 'row', minHeight: UI_TOKENS.target.touch, paddingHorizontal: UI_TOKENS.spacing.md},
  overflowMenuIcon: {color: colors.accent, fontSize: 19, marginRight: UI_TOKENS.spacing.sm},
  overflowMenuText: {color: colors.text, fontSize: 15, fontWeight: '700'},
  editBanner: {alignItems: 'center', backgroundColor: colors.cardRaised, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.md, paddingHorizontal: UI_TOKENS.spacing.md, paddingVertical: UI_TOKENS.spacing.sm},
  editBannerText: {color: colors.warning, fontSize: 14, fontWeight: '800'},
  cardGrid: {gap: UI_TOKENS.spacing.sm},
  cardShadow: {elevation: 1, shadowColor: colors.shadow, shadowOffset: {height: 2, width: 0}, shadowOpacity: 0.035, shadowRadius: 6},
  summaryCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: UI_TOKENS.radius.card, borderWidth: 1, padding: UI_TOKENS.spacing.lg},
  disabledCard: {opacity: 0.72},
  cardTitle: {color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase'},
  cardValue: {color: colors.text, fontSize: 20, fontWeight: '800', marginTop: UI_TOKENS.spacing.sm},
  cardDetail: {color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: UI_TOKENS.spacing.xs},
  recoveryKey: {backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15, letterSpacing: 1.2, lineHeight: 25, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  cardAction: {alignItems: 'center', alignSelf: 'flex-start', justifyContent: 'center', marginTop: UI_TOKENS.spacing.sm, minHeight: UI_TOKENS.target.touch, paddingVertical: UI_TOKENS.spacing.sm},
  disabledAction: {opacity: 0.6},
  cardActionText: {color: colors.accent, fontSize: 14, fontWeight: '800'},
  sectionTitle: {color: colors.text, fontSize: 17, fontWeight: '800', marginTop: UI_TOKENS.spacing.xl, marginBottom: UI_TOKENS.spacing.sm},
  settingsAppbar: {backgroundColor: colors.background},
  settingsAppbarTitle: {color: colors.text, fontSize: 22, fontWeight: '800'},
  settingsDetailContent: {paddingBottom: UI_TOKENS.spacing.xxl, paddingHorizontal: UI_TOKENS.spacing.lg, paddingTop: UI_TOKENS.spacing.sm},
  settingsStack: {gap: UI_TOKENS.spacing.md},
  settingsFieldStack: {gap: UI_TOKENS.spacing.sm},
  settingsList: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: UI_TOKENS.radius.panel, borderWidth: 1, marginTop: UI_TOKENS.spacing.sm},
  settingsListContent: {borderRadius: UI_TOKENS.radius.panel, overflow: 'hidden'},
  settingsNavigationRow: {backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, minHeight: 68, paddingHorizontal: UI_TOKENS.spacing.xs},
  settingsNavigationRowLast: {borderBottomWidth: 0},
  settingsNavigationTitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  settingsNavigationDescription: {color: colors.muted, fontSize: 13},
  disclosure: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: UI_TOKENS.radius.panel, borderWidth: 1, marginTop: UI_TOKENS.spacing.md},
  compactDisclosure: {backgroundColor: colors.cardRaised, borderRadius: 11, marginTop: UI_TOKENS.spacing.sm},
  disclosureClip: {borderRadius: UI_TOKENS.radius.panel, overflow: 'hidden'},
  disclosureButton: {backgroundColor: colors.card, minHeight: 54},
  compactDisclosureButton: {backgroundColor: colors.cardRaised, minHeight: UI_TOKENS.target.touch},
  disclosureBody: {borderTopColor: colors.border, borderTopWidth: 1, padding: UI_TOKENS.spacing.md},
  compactDisclosureBody: {padding: UI_TOKENS.spacing.md},
  disclosureTitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  disclosureSubtitle: {color: colors.muted, fontSize: 13, marginTop: UI_TOKENS.spacing.xs},
  disclosureIcon: {color: colors.accent, fontSize: 25, fontWeight: '700', marginLeft: UI_TOKENS.spacing.md},
  emptyState: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: UI_TOKENS.spacing.lg},
  emptyStateText: {color: colors.muted, fontSize: 14, lineHeight: 20},
  listRow: {alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 58, paddingHorizontal: UI_TOKENS.spacing.md},
  touchableRowContent: {alignItems: 'center', flex: 1, flexDirection: 'row'},
  listBody: {flex: 1},
  listTitle: {color: colors.text, fontSize: 15, fontWeight: '700'},
  listMeta: {color: colors.muted, fontSize: 12, marginTop: UI_TOKENS.spacing.xs},
  chevron: {color: colors.muted, fontSize: 28, marginLeft: UI_TOKENS.spacing.md},
  formCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: UI_TOKENS.spacing.lg},
  inlinePanel: {backgroundColor: colors.cardRaised, borderRadius: 12, padding: UI_TOKENS.spacing.md},
  searchAccessNote: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: UI_TOKENS.spacing.md},
  searchResultRow: {backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, padding: UI_TOKENS.spacing.lg},
  searchResultKind: {color: colors.accent, fontSize: 12, fontWeight: '800', marginBottom: UI_TOKENS.spacing.xs, textTransform: 'uppercase'},
  importPreview: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  linkSection: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: UI_TOKENS.spacing.md, paddingTop: UI_TOKENS.spacing.xs},
  linkRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: UI_TOKENS.spacing.sm},
  linkEditor: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  splitLineCard: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  recurrenceOptions: {backgroundColor: colors.cardRaised, borderRadius: 14, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.lg},
  formLabel: {color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: UI_TOKENS.spacing.md, marginBottom: UI_TOKENS.spacing.sm},
  toggleRow: {backgroundColor: colors.input, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginTop: UI_TOKENS.spacing.sm, minHeight: 48, overflow: 'hidden'},
  toggleRowContent: {alignItems: 'center', flexDirection: 'row', minHeight: 48, paddingHorizontal: UI_TOKENS.spacing.xs},
  toggleRowSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  toggleMark: {color: colors.muted, fontSize: 22, fontWeight: '800', marginRight: UI_TOKENS.spacing.md},
  toggleLabel: {color: colors.text, fontSize: 15, fontWeight: '800'},
  toggleTextSelected: {color: colors.accentText},
  noteMarkupToolbar: {flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.xs},
  segmentRow: {alignItems: 'stretch', flexDirection: 'column', gap: UI_TOKENS.spacing.sm},
  segmentButton: {alignSelf: 'stretch', borderColor: colors.border, borderRadius: 9, width: '100%'},
  segmentButtonSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  segmentButtonContent: {minHeight: UI_TOKENS.target.control},
  segmentText: {color: colors.muted, fontSize: 12, fontWeight: '700', marginHorizontal: UI_TOKENS.spacing.micro, textAlign: 'center'},
  segmentTextSelected: {color: colors.accentText},
  paletteGrid: {gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.md},
  paletteOption: {backgroundColor: colors.input, borderColor: colors.border, borderRadius: 12, borderWidth: 1, minHeight: 62, paddingHorizontal: UI_TOKENS.spacing.md, paddingVertical: UI_TOKENS.spacing.sm, width: '100%'},
  paletteOptionContent: {alignItems: 'center', flexDirection: 'row'},
  paletteOptionSelected: {backgroundColor: colors.cardRaised, borderColor: colors.accent, borderWidth: 2},
  paletteSwatch: {borderRadius: 16, height: 28, width: 28},
  paletteOptionCopy: {flex: 1, marginLeft: UI_TOKENS.spacing.sm, minWidth: 0},
  paletteLabel: {color: colors.text, fontSize: 14, fontWeight: '800'},
  paletteDescription: {color: colors.muted, fontSize: 11, lineHeight: 14, marginTop: UI_TOKENS.spacing.micro},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm},
  chip: {borderColor: colors.border, borderRadius: 18, minHeight: UI_TOKENS.target.control},
  chipSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  chipText: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  chipTextSelected: {color: colors.accentText},
  input: {backgroundColor: colors.input, fontSize: 16, minHeight: UI_TOKENS.target.control},
  quietHoursInput: {flex: 1, minWidth: 0},
  multilineInput: {minHeight: 82, textAlignVertical: 'top'},
  primaryButton: {borderRadius: UI_TOKENS.radius.control, marginTop: UI_TOKENS.spacing.md},
  primaryButtonContent: {minHeight: UI_TOKENS.target.primary},
  primaryButtonText: {color: colors.accentText, fontSize: 15, fontWeight: '800'},
  textButton: {alignSelf: 'flex-start', marginTop: UI_TOKENS.spacing.xs, minHeight: UI_TOKENS.target.touch},
  textButtonText: {color: colors.accent, fontSize: 14, fontWeight: '800'},
  pressed: {opacity: 0.72},
  errorText: {color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: UI_TOKENS.spacing.md},
  warningText: {color: colors.warning, fontSize: 13, lineHeight: 19, marginTop: UI_TOKENS.spacing.md},
  successText: {color: colors.accent, fontSize: 14, lineHeight: 20, marginTop: UI_TOKENS.spacing.md},
  amount: {fontSize: 15, fontWeight: '800', marginLeft: UI_TOKENS.spacing.md},
  incomeText: {color: colors.accent},
  expenseText: {color: colors.warning},
  notesHero: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.sm},
  notesHeroCopy: {flex: 1},
  notesCountBadge: {alignItems: 'center', backgroundColor: colors.cardRaised, borderRadius: 14, minWidth: 56, paddingHorizontal: UI_TOKENS.spacing.md, paddingVertical: UI_TOKENS.spacing.sm},
  notesCountValue: {color: colors.text, fontSize: 18, fontWeight: '800'},
  notesCountLabel: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: UI_TOKENS.spacing.micro},
  notesSearchCard: {backgroundColor: colors.input, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: UI_TOKENS.spacing.sm, paddingHorizontal: UI_TOKENS.spacing.md, paddingVertical: UI_TOKENS.spacing.micro},
  notesSearchRow: {alignItems: 'center', flexDirection: 'row'},
  notesSearchIcon: {color: colors.muted, fontSize: 25, lineHeight: 32, marginRight: UI_TOKENS.spacing.sm},
  notesSearchInput: {color: colors.text, flex: 1, fontSize: 15, minHeight: 44, paddingVertical: UI_TOKENS.spacing.sm},
  notesSearchAction: {alignItems: 'center', height: UI_TOKENS.target.touch, justifyContent: 'center', width: UI_TOKENS.target.touch},
  notesSearchActionText: {color: colors.muted, fontSize: 25, fontWeight: '700'},
  notesFilterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm, marginBottom: UI_TOKENS.spacing.lg, marginTop: UI_TOKENS.spacing.md},
  notesSaveSearch: {alignItems: 'center', backgroundColor: colors.cardRaised, borderRadius: 14, flexDirection: 'row', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.md, paddingHorizontal: UI_TOKENS.spacing.md},
  notesSaveSearchInput: {color: colors.text, flex: 1, fontSize: 14, minHeight: 44, paddingVertical: UI_TOKENS.spacing.sm},
  notesSection: {marginTop: UI_TOKENS.spacing.lg},
  notesSectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.sm},
  notesSectionTitle: {color: colors.text, fontSize: 17, fontWeight: '800'},
  notesSectionCount: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  noteCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: UI_TOKENS.spacing.md, overflow: 'hidden'},
  noteCardMenu: {position: 'absolute', right: UI_TOKENS.spacing.xs, top: UI_TOKENS.spacing.xs, zIndex: 2},
  noteCardPinned: {borderColor: colors.warning},
  noteCardArchived: {opacity: 0.86},
  noteCardPressable: {padding: UI_TOKENS.spacing.lg, paddingRight: UI_TOKENS.target.touch + UI_TOKENS.spacing.sm},
  noteCardTopline: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  noteCategory: {color: colors.accent, fontSize: 13, fontWeight: '800'},
  noteCardTitle: {color: colors.text, fontSize: 17, fontWeight: '800', lineHeight: 22, marginTop: UI_TOKENS.spacing.sm},
  noteTagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.md},
  noteTag: {backgroundColor: colors.cardRaised, borderRadius: 10, color: colors.accent, fontSize: 12, fontWeight: '700', paddingHorizontal: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.xs},
  noteCardMetaRow: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.md},
  noteCardMeta: {color: colors.muted, fontSize: 12},
  fabScrollContent: {paddingBottom: UI_TOKENS.spacing.fabClearance},
  fabLayer: {position: 'absolute', bottom: 0, left: 0, right: 0},
  fab: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: UI_TOKENS.radius.fab, position: 'absolute', bottom: UI_TOKENS.spacing.lg, right: UI_TOKENS.spacing.lg, height: UI_TOKENS.target.fab, justifyContent: 'center', width: UI_TOKENS.target.fab},
  fabIcon: {color: colors.accentText, fontSize: 32, fontWeight: '300', lineHeight: 36},
  quickCaptureOptionContent: {alignItems: 'center', flexDirection: 'row', gap: UI_TOKENS.spacing.sm},
  quickCaptureMenu: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, bottom: UI_TOKENS.spacing.menuBottom, elevation: 3, padding: UI_TOKENS.spacing.xs, position: 'absolute', right: UI_TOKENS.spacing.lg, shadowColor: colors.shadow, shadowOffset: {height: 2, width: 0}, shadowOpacity: 0.08, shadowRadius: 6, width: 160},
  quickCaptureMenuTitle: {color: colors.muted, fontSize: 12, fontWeight: '800', paddingHorizontal: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.sm},
  quickCaptureOption: {borderRadius: 9, paddingHorizontal: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.sm},
  quickCaptureOptionText: {color: colors.text, fontSize: 14, fontWeight: '700'},
  savedSearchRow: {borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: UI_TOKENS.spacing.sm, paddingTop: UI_TOKENS.spacing.sm},
  noteActions: {borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', marginTop: UI_TOKENS.spacing.sm},
  attachmentSection: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: UI_TOKENS.spacing.md, paddingTop: UI_TOKENS.spacing.xs},
  attachmentRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: UI_TOKENS.spacing.xs},
  attachmentName: {color: colors.text, fontSize: 14, fontWeight: '700'},
  manageRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: UI_TOKENS.spacing.sm},
  metricRow: {borderBottomColor: colors.border, borderBottomWidth: 1, gap: UI_TOKENS.spacing.xs, paddingVertical: UI_TOKENS.spacing.sm},
  metricValue: {color: colors.text, fontSize: 15, fontWeight: '800'},
  noteBody: {color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: UI_TOKENS.spacing.sm},
  noteHeading: {color: colors.text, fontSize: 15, fontWeight: '800'},
  noteBulletMarker: {color: colors.accent, fontWeight: '800'},
  noteMarkupBold: {fontWeight: '800'},
  noteMarkupItalic: {fontStyle: 'italic'},
  noteMarkupCode: {backgroundColor: colors.cardRaised, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  tasksHero: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.xs},
  tasksHeroCopy: {flex: 1},
  tasksCountBadge: {alignItems: 'center', backgroundColor: colors.cardRaised, borderRadius: 14, minWidth: 56, paddingHorizontal: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.sm},
  tasksCountValue: {color: colors.text, fontSize: 18, fontWeight: '800'},
  tasksCountLabel: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: UI_TOKENS.spacing.micro},
  fullWidthControl: {marginBottom: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.xs, width: '100%'},
  fullWidthControlContent: {minHeight: UI_TOKENS.target.touch},
  taskSection: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  taskSectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.sm},
  taskSectionTitleRow: {alignItems: 'center', flexDirection: 'row', gap: UI_TOKENS.spacing.sm},
  taskSectionTitle: {color: colors.text, fontSize: 18, fontWeight: '800'},
  taskSectionMeta: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  taskSectionIntro: {color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: UI_TOKENS.spacing.xs},
  taskCountBadge: {backgroundColor: colors.cardRaised, borderRadius: 12, color: colors.accent, fontSize: 13, fontWeight: '800', minWidth: 26, paddingHorizontal: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.xs, textAlign: 'center'},
  taskAgendaDay: {color: colors.accent, fontSize: 14, fontWeight: '800', marginTop: UI_TOKENS.spacing.lg, marginBottom: UI_TOKENS.spacing.xs},
  taskCard: {backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: UI_TOKENS.spacing.md},
  taskCardCompleted: {opacity: 0.78},
  taskCardMain: {alignItems: 'flex-start', flexDirection: 'row'},
  taskCheckButton: {alignItems: 'center', height: UI_TOKENS.target.touch, justifyContent: 'center', width: UI_TOKENS.target.touch},
  taskContentButton: {flex: 1, minWidth: 0, paddingRight: UI_TOKENS.spacing.sm},
  taskCardTitle: {color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 21},
  taskMetaRow: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.xs},
  taskDueMeta: {color: colors.accent, fontSize: 13, fontWeight: '700'},
  taskMetaAccent: {color: colors.accent, fontSize: 13},
  taskMeta: {color: colors.muted, fontSize: 12, marginTop: UI_TOKENS.spacing.xs},
  taskCardRight: {alignItems: 'center', marginLeft: UI_TOKENS.spacing.xs},
  taskPriorityHigh: {color: colors.warning, fontSize: 21, lineHeight: 26},
  taskPriorityNormal: {color: colors.muted, fontSize: 21, lineHeight: 26},
  taskMoreButton: {alignItems: 'center', height: UI_TOKENS.target.touch, justifyContent: 'center', marginTop: UI_TOKENS.spacing.micro, width: UI_TOKENS.target.touch},
  taskMoreIcon: {color: colors.muted, fontSize: 16, fontWeight: '800', letterSpacing: 2},
  taskCardActions: {borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: UI_TOKENS.spacing.lg, marginTop: UI_TOKENS.spacing.md, paddingTop: UI_TOKENS.spacing.xs},
  taskOverviewCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  taskOverviewHeader: {gap: UI_TOKENS.spacing.md},
  taskOverviewTitle: {color: colors.text, fontSize: 18, fontWeight: '800'},
  taskOverviewValue: {color: colors.text, fontSize: 28, fontWeight: '800', marginTop: UI_TOKENS.spacing.xs},
  taskOverviewMeta: {color: colors.muted, fontSize: 13, marginTop: UI_TOKENS.spacing.micro},
  taskCompletedSummary: {alignItems: 'flex-start', backgroundColor: colors.cardRaised, borderRadius: 16, paddingHorizontal: UI_TOKENS.spacing.md, paddingVertical: UI_TOKENS.spacing.md},
  taskCompletedValue: {color: colors.accent, fontSize: 28, fontWeight: '800'},
  taskOverviewList: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: UI_TOKENS.spacing.lg, paddingTop: UI_TOKENS.spacing.md},
  taskOverviewRow: {alignItems: 'center', flexDirection: 'row', gap: UI_TOKENS.spacing.sm, marginTop: UI_TOKENS.spacing.sm},
  taskOverviewLabel: {color: colors.text, fontSize: 13, width: 96},
  taskOverviewTrack: {backgroundColor: colors.cardRaised, borderRadius: 4, flex: 1, height: 8, overflow: 'hidden'},
  taskOverviewFill: {backgroundColor: colors.accent, borderRadius: 4, height: 8},
  taskOverviewCount: {color: colors.muted, fontSize: 13, fontWeight: '800', minWidth: 18, textAlign: 'right'},
  taskRow: {alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 66, paddingHorizontal: UI_TOKENS.spacing.md},
  taskToggle: {alignItems: 'center', flex: 1, flexDirection: 'row', paddingVertical: UI_TOKENS.spacing.md},
  taskActions: {alignItems: 'center', flexDirection: 'row'},
  taskListRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: UI_TOKENS.spacing.sm},
  taskListActions: {alignItems: 'center', flexDirection: 'row'},
  checkbox: {alignItems: 'center', borderColor: colors.muted, borderRadius: 6, borderWidth: 1, height: 23, justifyContent: 'center', marginRight: UI_TOKENS.spacing.md, width: 23},
  checkboxDone: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkmark: {color: colors.accentText, fontSize: 16, fontWeight: '800'},
  completedText: {color: colors.muted, textDecorationLine: 'line-through'},
  tabBar: {backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, elevation: 4, shadowColor: colors.shadow, shadowOffset: {height: -3, width: 0}, shadowOpacity: 0.06, shadowRadius: 8},
  tab: {alignItems: 'center', flex: 1, minHeight: UI_TOKENS.target.tab, paddingVertical: UI_TOKENS.spacing.micro},
  tabIcon: {color: colors.muted, fontSize: 20, height: 25},
  tabLabel: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: UI_TOKENS.spacing.micro},
  tabSelected: {color: colors.accent},
  loading: {backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: UI_TOKENS.spacing.xxl},
  loadingMessage: {color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: UI_TOKENS.spacing.md},
  dangerText: {color: colors.danger},
  homeMoneyWidget: {backgroundColor: colors.accent, borderRadius: 18, marginBottom: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.lg},
  homeWidgetAction: {color: colors.accentText, fontSize: 13, fontWeight: '800', marginTop: UI_TOKENS.spacing.sm},
  homeBalanceLabel: {color: colors.accentText, fontSize: 15, fontWeight: '700'},
  homeBalanceCurrency: {color: colors.accentText, fontSize: 13, fontWeight: '800', opacity: 0.78},
  homeBalanceValue: {color: colors.accentText, fontSize: 32, fontWeight: '800', letterSpacing: -0.7, marginTop: UI_TOKENS.spacing.md},
  homeBalanceDetail: {color: colors.accentText, fontSize: 13, marginTop: UI_TOKENS.spacing.sm, opacity: 0.85},
  homeSectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  homeMuted: {color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: UI_TOKENS.spacing.md},
  moneyOverviewCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: UI_TOKENS.spacing.md, overflow: 'hidden'},
  moneyBalanceCard: {backgroundColor: colors.accent, padding: UI_TOKENS.spacing.lg},
  moneyBalanceLabel: {color: colors.accentText, fontSize: 15, fontWeight: '700'},
  moneyBalanceCurrency: {color: colors.accentText, fontSize: 13, fontWeight: '800', opacity: 0.78},
  moneyBalanceValue: {color: colors.accentText, fontSize: 32, fontWeight: '800', letterSpacing: -0.7, marginTop: UI_TOKENS.spacing.md},
  moneyBalanceDetail: {color: colors.accentText, fontSize: 13, marginTop: UI_TOKENS.spacing.sm, opacity: 0.85},
  moneyOverviewMeta: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  moneyActivityRow: {borderTopColor: colors.border, borderTopWidth: 1, gap: UI_TOKENS.spacing.md, marginTop: UI_TOKENS.spacing.sm, padding: UI_TOKENS.spacing.md},
  moneyActivityRight: {alignItems: 'flex-start'},
  moneyActivityValue: {color: colors.text, fontSize: 15, fontWeight: '800', marginTop: UI_TOKENS.spacing.xs},
  moneyChartCard: {backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: UI_TOKENS.spacing.md, padding: UI_TOKENS.spacing.md},
  moneyChartHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  moneyChartTitle: {color: colors.text, fontSize: 18, fontWeight: '800'},
  moneyChartSubtitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  chartBarRow: {marginTop: UI_TOKENS.spacing.md},
  chartBarHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  chartBarLabel: {color: colors.text, flex: 1, fontSize: 14, fontWeight: '700'},
  chartBarAmount: {color: colors.muted, fontSize: 13, fontWeight: '700', marginLeft: UI_TOKENS.spacing.sm},
  chartBarTrack: {backgroundColor: colors.cardRaised, borderRadius: 5, height: 8, marginTop: UI_TOKENS.spacing.sm, overflow: 'hidden'},
  chartBarFill: {backgroundColor: colors.accent, borderRadius: 5, height: 8},
  chartEmpty: {color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: UI_TOKENS.spacing.md},
  chartDivider: {borderTopColor: colors.border, borderTopWidth: 1, marginTop: UI_TOKENS.spacing.xl, paddingTop: UI_TOKENS.spacing.lg},
  chartLegend: {flexDirection: 'row', gap: UI_TOKENS.spacing.sm},
  chartLegendItem: {alignItems: 'center', flexDirection: 'row', gap: UI_TOKENS.spacing.xs},
  chartLegendExpense: {backgroundColor: colors.warning, borderRadius: 3, height: 8, width: 8},
  chartLegendIncome: {backgroundColor: colors.accent, borderRadius: 3, height: 8, width: 8},
  chartLegendText: {color: colors.muted, fontSize: 11, fontWeight: '700'},
  chartStrip: {alignItems: 'stretch', flexDirection: 'row', height: 96, marginTop: UI_TOKENS.spacing.md},
  chartColumn: {alignItems: 'center', flex: 1, minWidth: 0},
  chartColumnBars: {alignItems: 'flex-end', flex: 1, flexDirection: 'row', gap: UI_TOKENS.spacing.micro, justifyContent: 'center'},
  chartColumnBar: {borderRadius: 3, minHeight: 0, width: 5},
  chartColumnExpense: {backgroundColor: colors.warning},
  chartColumnIncome: {backgroundColor: colors.accent},
  chartDayLabel: {color: colors.muted, fontSize: 9, marginTop: UI_TOKENS.spacing.xs},
});
}
