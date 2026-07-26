import {useEffect, useState} from 'react';
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
import {getLocalDateKeys, getPeriodRange, isInPeriod, localDateKey} from '../shared/period';
import type {Period} from '../shared/period';
import {buildBudgetProjection, validateMoneyBudget, type MoneyBudgetInput} from '../shared/moneyBudget';
import {buildMoneyReport} from '../shared/moneyReport';
import {validateMoneySplit, type MoneySplitInput} from '../shared/moneySplit';
import {calculateAccountBalance, validateMoneyTransfer} from '../shared/moneyTransfer';
import {aggregateUsage, assignUsageRangeDate, sumUsage} from '../shared/usage';
import {buildJsonExport, buildMoneyCsvExport} from '../shared/dataExport';
import {parseJsonImport, type JsonImportPreview} from '../shared/dataImport';
import {type MoneyRecurrenceInput} from '../shared/moneyRecurrence';
import {usageAccess} from '../platform/usageAccess';
import type {AppData, BudgetPeriod, BudgetRollover, MoneyKind, MoneyTransfer, RecurrenceCadence} from '../types/domain';

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
  const {data, isLoading, error} = useAppStore();
  const [tab, setTab] = useState<Tab>('home');
  const [dataToolsOpen, setDataToolsOpen] = useState(false);

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
        {dataToolsOpen ? (
          <DataToolsScreen data={data} onBack={() => setDataToolsOpen(false)} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen data={data} onNavigate={setTab} onOpenDataTools={() => setDataToolsOpen(true)} />}
            {tab === 'money' && <MoneyScreen />}
            {tab === 'notes' && <NotesScreen />}
            {tab === 'tasks' && <TasksScreen />}
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
}: {
  data: AppData;
  onNavigate: (tab: Tab) => void;
  onOpenDataTools: () => void;
}) {
  const monthRange = getPeriodRange(new Date(), 'month');
  const monthMoney = data.money.filter(entry => isInPeriod(entry.occurredAt, monthRange));
  const expenses = sumMoney(monthMoney, 'expense');
  const income = sumMoney(monthMoney, 'income');
  const openTasks = data.tasks.filter(task => task.status === 'open').length;
  const recentNotes = data.notes.slice(0, 3);
  const today = localDateKey(new Date());
  const appTimeSeconds = sumUsage(data.usageSnapshots, new Set([today]));
  const hasUsagePermission = data.usageRead.permission === 'granted';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Today</Text>
      <Text style={styles.pageIntro}>A small, honest view of what is in your workspace.</Text>
      <TextButton label="Export, restore, or delete data" onPress={onOpenDataTools} />

      <View style={styles.cardGrid}>
        <SummaryCard
          title="Money"
          value={formatMoney(expenses, data.mainCurrency)}
          detail={`${formatMoney(income, data.mainCurrency)} income this month`}
          action="Open money"
          onPress={() => onNavigate('money')}
        />
        <SummaryCard
          title="App time"
          value={hasUsagePermission ? formatDuration(appTimeSeconds) : 'Not connected'}
          detail={hasUsagePermission ? 'Today from Android Usage Access.' : 'Connect Android Usage Access to read today.'}
          action={hasUsagePermission ? 'Open app time' : 'Set up access'}
          onPress={() => onNavigate('appTime')}
        />
        <SummaryCard
          title="Tasks"
          value={`${openTasks} open`}
          detail={openTasks === 0 ? 'All clear for now.' : 'Keep the next action visible.'}
          action="Open tasks"
          onPress={() => onNavigate('tasks')}
        />
        <SummaryCard
          title="Notes"
          value={`${data.notes.length} saved`}
          detail={recentNotes[0]?.title ?? 'Capture your first thought.'}
          action="Open notes"
          onPress={() => onNavigate('notes')}
        />
      </View>

      <SectionTitle title="Recent notes" />
      {recentNotes.length === 0 ? (
        <EmptyState text="No notes yet. Use Notes to keep a small record of what matters." />
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

function DataToolsScreen({data, onBack}: {data: AppData; onBack: () => void}) {
  const {resetWorkspace, restoreWorkspace} = useAppStore();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<JsonImportPreview | null>(null);

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
    try {
      setImportPreview(parseJsonImport(importText));
    } catch (restoreError) {
      setImportPreview(null);
      setError(restoreError instanceof Error ? restoreError.message : 'The JSON export could not be validated.');
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
        {status && <Text style={styles.successText}>{status}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Restore JSON export</Text>
        <Text style={styles.cardDetail}>Paste a Yuzuha JSON export here. Nothing changes until you review the count and confirm the replacement.</Text>
        <TextInput
          accessibilityLabel="JSON restore text"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={value => {
            setImportText(value);
            setImportPreview(null);
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
            <Text style={styles.cardDetail}>{formatImportPreview(importPreview)}</Text>
            <PrimaryButton label="Restore this workspace" onPress={confirmRestore} />
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
    ['tasks', 'tasks'],
    ['usageSnapshots', 'app-time records'],
    ['timeGoals', 'time goals'],
  ];
  const summary = labels
    .filter(([key]) => preview.recordCounts[key] > 0)
    .map(([key, label]) => `${preview.recordCounts[key]} ${label}`);
  return `${preview.totalRecords} total records${summary.length > 0 ? `: ${summary.join(', ')}` : '.'}`;
}

function MoneyScreen() {
  const {
    data,
    addMoney,
    updateMoney,
    deleteMoney,
    addMoneyAccount,
    addMoneyCategory,
    archiveMoneyAccount,
    archiveMoneyCategory,
  } = useAppStore();
  const [kind, setKind] = useState<MoneyKind>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'entry' | 'budget' | 'split' | 'transfer' | 'report' | 'recurrence'>('entry');

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

  const visibleCategories = data.categories.filter(
    item => !item.isArchived && (item.kind === kind || item.kind === 'both'),
  );
  const activeCategoryId = categoryId || visibleCategories[0]?.id;
  const activeAccountId = accountId || data.accounts.find(account => !account.isArchived)?.id;

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
        </View>

        <SectionTitle title="Recent entries" />
        {data.money.filter(entry => !entry.splitId && !data.splits.some(split => split.parentEntryId === entry.id)).length === 0 ? (
          <EmptyState text="No money entries for this workspace." />
        ) : (
          data.money
            .filter(entry => !entry.splitId && !data.splits.some(split => split.parentEntryId === entry.id))
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
                <Text style={styles.listMeta}>{entry.note || formatDate(entry.occurredAt)}</Text>
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
            const projection = buildBudgetProjection(budget, data.money, data.splits, new Date());
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
  const range = getPeriodRange(new Date(), period);
  const report = buildMoneyReport(data.money, range, data.splits);

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
      {report.currencies.length === 0 ? (
        <EmptyState text="No money entries for this period." />
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
  const [goalName, setGoalName] = useState('Weekly attention');
  const [goalPeriod, setGoalPeriod] = useState<'day' | 'week'>('week');
  const [goalMinutes, setGoalMinutes] = useState('300');

  useEffect(() => {
    void checkPermission();
  }, []);

  if (!data) {
    return null;
  }

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
    setMessage(null);
    const range = getPeriodRange(new Date(), 'day');
    try {
      const rawRecords = await usageAccess.query(range.start.getTime(), range.end.getTime());
      const records = assignUsageRangeDate(rawRecords, range.start.getTime());
      const snapshots = aggregateUsage(records, new Date().toISOString());
      await replaceUsageSnapshots({
        snapshots,
        localDates: new Set([localDateKey(range.start)]),
        rangeStartMillis: range.start.getTime(),
        rangeEndMillis: range.end.getTime(),
      });
      setMessage(`${snapshots.length} app records read from Android.`);
    } catch {
      setMessage('Android could not provide usage data. Check permission and try again.');
    } finally {
      setIsRefreshing(false);
    }
  }

  const today = localDateKey(new Date());
  const allTodaySnapshots = data.usageSnapshots
    .filter(snapshot => snapshot.localDate === today)
    .sort((left, right) => right.durationSeconds - left.durationSeconds);
  const todaySnapshots = allTodaySnapshots.filter(snapshot => snapshot.included);
  const totalSeconds = todaySnapshots.reduce((total, snapshot) => total + snapshot.durationSeconds, 0);
  const weekRange = getPeriodRange(new Date(), 'week');
  const weekDates = getLocalDateKeys(weekRange);
  const weeklySeconds = sumUsage(data.usageSnapshots, weekDates);
  const activeGoal = data.timeGoals.find(goal => !goal.isArchived && goal.period === goalPeriod);
  const goalSeconds = goalPeriod === 'day' ? totalSeconds : weeklySeconds;

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
          <SummaryCard
            title="Today"
            value={formatDuration(totalSeconds)}
            detail={data.usageRead.lastReadAt ? `Last read ${formatDate(data.usageRead.lastReadAt)}` : 'No read yet'}
            action={isRefreshing ? 'Reading...' : 'Refresh usage'}
            disabled={isRefreshing}
            onPress={refreshUsage}
          />
          {message && <Text style={styles.successText}>{message}</Text>}
          <SectionTitle title="Top apps today" />
          {allTodaySnapshots.length === 0 ? (
            <EmptyState text="No app-time data has been read for today." />
          ) : (
            allTodaySnapshots.slice(0, 10).map(snapshot => (
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

function NotesScreen() {
  const {data, addNote} = useAppStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return null;
  }

  async function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give the note a short title.');
      return;
    }
    setError(null);
    await addNote({title: trimmedTitle, body: body.trim()});
    setTitle('');
    setBody('');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Notes</Text>
        <Text style={styles.pageIntro}>Capture first. Organize more later.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            accessibilityLabel="Note title"
            placeholder="A thought worth keeping"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.formLabel}>Body (optional)</Text>
          <TextInput
            accessibilityLabel="Note body"
            placeholder="Write a few lines..."
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={body}
            onChangeText={setBody}
            multiline
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Save note" onPress={save} />
        </View>
        <SectionTitle title="All notes" />
        {data.notes.length === 0 ? (
          <EmptyState text="No notes yet." />
        ) : (
          data.notes.map(note => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.listTitle}>{note.title}</Text>
              {!!note.body && <Text style={styles.noteBody} numberOfLines={3}>{note.body}</Text>}
              <Text style={styles.listMeta}>{formatDate(note.updatedAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TasksScreen() {
  const {data, addTask, toggleTask} = useAppStore();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return null;
  }

  async function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give the task a clear next action.');
      return;
    }
    setError(null);
    await addTask({title: trimmedTitle, details: details.trim()});
    setTitle('');
    setDetails('');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Tasks</Text>
        <Text style={styles.pageIntro}>Keep one next action visible.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Task</Text>
          <TextInput
            accessibilityLabel="Task title"
            placeholder="What needs doing?"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.formLabel}>Details (optional)</Text>
          <TextInput
            accessibilityLabel="Task details"
            placeholder="Add context..."
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineInput]}
            value={details}
            onChangeText={setDetails}
            multiline
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Add task" onPress={save} />
        </View>
        <SectionTitle title="Open and completed" />
        {data.tasks.length === 0 ? (
          <EmptyState text="No tasks yet." />
        ) : (
          data.tasks.map(task => (
            <Pressable
              key={task.id}
              accessibilityLabel={task.status === 'open' ? `Complete ${task.title}` : `Reopen ${task.title}`}
              accessibilityRole="button"
              style={styles.taskRow}
              onPress={() => toggleTask(task.id)}>
              <View style={[styles.checkbox, task.status === 'completed' && styles.checkboxDone]}>
                {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.listBody}>
                <Text style={[styles.listTitle, task.status === 'completed' && styles.completedText]}>{task.title}</Text>
                {!!task.details && <Text style={styles.listMeta} numberOfLines={1}>{task.details}</Text>}
              </View>
            </Pressable>
          ))
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

function PrimaryButton({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({pressed}) => [styles.primaryButton, pressed && styles.pressed]}
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
  importPreview: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: 14, padding: 12},
  splitLineCard: {backgroundColor: colors.cardRaised, borderRadius: 12, marginTop: 14, padding: 12},
  formLabel: {color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 7},
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
  manageRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8},
  rowActions: {alignItems: 'flex-end', marginLeft: 10},
  noteBody: {color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8},
  taskRow: {alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 66, paddingHorizontal: 14},
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
