// DashboardScreen.js
import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  scheduleTaskAlarm,
  cancelAllTaskAlarms,
} from '../src/notifications';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLORS = {
  primary: '#6366f1',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  secondaryText: '#94a3b8',
  success: '#22c55e',
  danger: '#ef4444',
};
const DIM = {
  cardWidth: SCREEN_WIDTH * 0.75,
  borderRadius: 20,
  spacing: 16,
  iconSize: 24,
  summaryIcon: 28,
};

export default function DashboardScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState(null);

  // The “edit” form state:
  const [editText, setEditText] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('Work');
  const [editPriority, setEditPriority] = React.useState('High');
  const [editDueDate, setEditDueDate] = React.useState(new Date());
  const [editDueTime, setEditDueTime] = React.useState(new Date());
  const [editNotes, setEditNotes] = React.useState('');
  const [editShowDatePicker, setEditShowDatePicker] = React.useState(false);
  const [editShowTimePicker, setEditShowTimePicker] = React.useState(false);

  const [actionLoading, setActionLoading] = React.useState(false);

  // 1) Request notification permissions once on mount
  React.useEffect(() => {
    (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in settings to receive task reminders.'
        );
      }
    })();

    // 2) Show banner + alert for incoming foreground notifications
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const { title, body } = n.request.content;
      Alert.alert(title, body);
    });
    return () => sub.remove();
  }, []);

  // 3) Fetch tasks whenever screen is focused or token changes
  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
    }, [token])
  );

  // 4) Reschedule alarms whenever tasks change
  React.useEffect(() => {
    (async () => {
      await cancelAllTaskAlarms();
      tasks.filter((t) => !t.completed).forEach(scheduleTaskAlarm);
    })();
  }, [tasks]);

  // Utility to format dates and times
  const formatDate = (d) =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (t) =>
    t.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  async function fetchTasks() {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/tasks/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Delete failed');
            await fetchTasks();
            Alert.alert('Task deleted');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleEdit = (t) => {
    // Populate all edit fields from the tapped task
    setEditingId(t.id);
    setEditText(t.text);
    setEditCategory(t.category || 'Work');
    setEditPriority(t.priority || 'High');

    // Parse due_date (YYYY-MM-DD) back into a JS Date
    const [year, month, day] = (t.due_date || '').split('-').map(Number);
    if (year && month && day) {
      setEditDueDate(new Date(year, month - 1, day));
    } else {
      setEditDueDate(new Date());
    }

    // Parse due_time (HH:MM:SS) into a JS Date
    if (t.due_time) {
      const [hh, mm] = t.due_time.split(':').map(Number);
      const tmp = new Date();
      tmp.setHours(hh, mm, 0, 0);
      setEditDueTime(tmp);
    } else {
      setEditDueTime(new Date());
    }

    setEditNotes(t.notes || '');
  };

  const handleSave = async () => {
    if (!editText.trim()) {
      return Alert.alert('Error', 'Task name cannot be empty');
    }
    try {
      setActionLoading(true);

      // Build the payload exactly as HomeScreen does
      const payload = {
        text: editText.trim(),
        category: editCategory,
        priority: editPriority,
        due_date: editDueDate.toISOString().split('T')[0], // "YYYY-MM-DD"
        due_time: `${editDueTime.getHours()}:${editDueTime.getMinutes()}:00`,
        notes: editNotes.trim() || null,
      };

      const res = await fetch(`${API_URL}/api/tasks/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');

      // Clear editing state and reload tasks
      setEditingId(null);
      setEditText('');
      setEditCategory('Work');
      setEditPriority('High');
      setEditDueDate(new Date());
      setEditDueTime(new Date());
      setEditNotes('');
      await fetchTasks();
      Alert.alert('Task updated');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditCategory('Work');
    setEditPriority('High');
    setEditDueDate(new Date());
    setEditDueTime(new Date());
    setEditNotes('');
  };

  const handleMarkDone = async (t) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error('Complete failed');
      await fetchTasks();
      Alert.alert('Task completed');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearCompleted = () => {
    const completedTasks = tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      Alert.alert('Nothing to clear', 'There are no completed tasks to delete.');
      return;
    }
    Alert.alert(
      'Clear Completed Tasks',
      'Are you sure you want to delete all completed tasks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await Promise.all(
                completedTasks.map((t) =>
                  fetch(`${API_URL}/api/tasks/${t.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  }).then((res) => {
                    if (!res.ok) {
                      throw new Error(`Failed to delete task ${t.id}`);
                    }
                  })
                )
              );
              await fetchTasks();
              Alert.alert('All completed tasks cleared');
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const summary = [
    { key: 'Total', count: tasks.length, icon: 'layers' },
    { key: 'Pending', count: tasks.filter((t) => !t.completed).length, icon: 'time' },
    { key: 'Completed', count: tasks.filter((t) => t.completed).length, icon: 'checkmark' },
  ];

  const renderCard = ({ item }) => (
    <LinearGradient
      colors={['#1e293b', '#0f172a']}
      style={styles.card}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={item.icon} size={DIM.summaryIcon} color={COLORS.primary} />
      </View>
      <Text style={styles.cardCount}>{item.count}</Text>
      <Text style={styles.cardLabel}>{item.key}</Text>
    </LinearGradient>
  );

  const renderTask = ({ item }) => {
    const done = !!item.completed;
    const editing = editingId === item.id;

    if (editing) {
      // Full edit form for this task
      return (
        <View style={styles.taskFormContainer}>
          {/* Task Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.formLabel}>Task Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter task name..."
              placeholderTextColor="#888"
              value={editText}
              onChangeText={setEditText}
              editable={!actionLoading}
            />
          </View>

          {/* Category & Priority */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex]}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editCategory}
                  onValueChange={(val) => setEditCategory(val)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {['Work', 'Personal', 'Shopping', 'Others'].map((opt) => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.inputContainer, styles.flex, styles.ml10]}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editPriority}
                  onValueChange={(val) => setEditPriority(val)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {['High', 'Medium', 'Low'].map((opt) => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex]}>
              <Text style={styles.formLabel}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setEditShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={styles.dateText}>{formatDate(editDueDate)}</Text>
              </TouchableOpacity>
              {editShowDatePicker && (
                <DateTimePicker
                  value={editDueDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, selected) => {
                    setEditShowDatePicker(false);
                    if (selected) setEditDueDate(selected);
                  }}
                />
              )}
            </View>

            <View style={[styles.inputContainer, styles.flex, styles.ml10]}>
              <Text style={styles.formLabel}>Due Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setEditShowTimePicker(true)}
              >
                <Ionicons name="time" size={18} color="#fff" />
                <Text style={styles.dateText}>{formatTime(editDueTime)}</Text>
              </TouchableOpacity>
              {editShowTimePicker && (
                <DateTimePicker
                  value={editDueTime}
                  mode="time"
                  display="spinner"
                  onChange={(_, selected) => {
                    setEditShowTimePicker(false);
                    if (selected) setEditDueTime(selected);
                  }}
                />
              )}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputContainer}>
            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.formInput, styles.notesInput]}
              placeholder="Add notes..."
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
              value={editNotes}
              onChangeText={setEditNotes}
              editable={!actionLoading}
            />
          </View>

          {/* Save & Cancel Buttons */}
          <View style={styles.formButtonsRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={24} color={COLORS.success} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              disabled={actionLoading}
            >
              <Ionicons name="close" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // View mode (icons aligned center with task name)
    return (
      <View style={[styles.task, done && styles.completed]}>
        <View style={styles.taskLeft}>
          {!done ? (
            <TouchableOpacity onPress={() => handleMarkDone(item)} disabled={actionLoading}>
              <Ionicons
                name="radio-button-off"
                size={DIM.iconSize}
                color={COLORS.secondaryText}
              />
            </TouchableOpacity>
          ) : (
            <Ionicons name="checkmark-circle" size={DIM.iconSize} color={COLORS.success} />
          )}
          <View style={styles.taskTextContainer}>
            <Text style={[styles.taskTextTitle, done && styles.strike]}>{item.text}</Text>
          </View>
        </View>
        {!done && (
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item)}
              disabled={actionLoading}
            >
              <Ionicons name="create" size={DIM.iconSize} color={COLORS.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item.id)}
              disabled={actionLoading}
            >
              <Ionicons name="trash" size={DIM.iconSize} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, '#0c1a32']} style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, '#0c1a32']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Task Overview</Text>
          </View>

          <FlatList
            data={summary}
            horizontal
            keyExtractor={(i) => i.key}
            renderItem={renderCard}
            contentContainerStyle={styles.cards}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={DIM.cardWidth + DIM.spacing}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Tasks</Text>
            {tasks.filter((t) => !t.completed).length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="checkmark-done" size={48} color={COLORS.secondaryText} />
                <Text style={styles.emptyText}>All done!</Text>
              </View>
            ) : (
              <FlatList
                data={tasks.filter((t) => !t.completed)}
                renderItem={renderTask}
                scrollEnabled={false}
                keyExtractor={(i) => i.id.toString()}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Tasks</Text>
            <View style={styles.clearButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  (actionLoading || tasks.filter((t) => t.completed).length === 0) && styles.clearButtonDisabled,
                ]}
                onPress={handleClearCompleted}
                disabled={actionLoading || tasks.filter((t) => t.completed).length === 0}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {tasks.filter((t) => t.completed).length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="timer" size={48} color={COLORS.secondaryText} />
                <Text style={styles.emptyText}>None yet</Text>
              </View>
            ) : (
              <FlatList
                data={tasks.filter((t) => t.completed)}
                renderItem={renderTask}
                scrollEnabled={false}
                keyExtractor={(i) => i.id.toString()}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: DIM.spacing, marginBottom: DIM.spacing },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  cards: { paddingHorizontal: DIM.spacing, paddingBottom: DIM.spacing },
  card: {
    width: DIM.cardWidth,
    borderRadius: DIM.borderRadius,
    padding: DIM.spacing * 1.5,
    marginRight: DIM.spacing,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardIcon: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, marginBottom: 12 },
  cardCount: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  cardLabel: { fontSize: 16, color: COLORS.secondaryText, fontWeight: '600' },
  section: {
    margin: DIM.spacing,
    padding: DIM.spacing,
    backgroundColor: COLORS.surface,
    borderRadius: DIM.borderRadius,
  },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: DIM.spacing / 2 },

  // Clear All button container and styles
  clearButtonContainer: { alignItems: 'flex-end', marginBottom: DIM.spacing / 2 },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.danger,
    borderRadius: 6,
  },
  clearButtonDisabled: {
    backgroundColor: `${COLORS.danger}80`,
  },
  clearButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  task: {
    flexDirection: 'row',
    alignItems: 'center', // icons & text centered vertically
    justifyContent: 'space-between',
    padding: DIM.spacing,
    marginBottom: DIM.spacing / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  completed: { opacity: 0.6, backgroundColor: `${COLORS.surface}90` },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center', // icons & text centered vertically
    flex: 1,
  },
  taskTextContainer: { flex: 1, marginLeft: 8 },
  taskTextTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through', color: COLORS.secondaryText },
  taskActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  actionButton: { padding: 8, marginHorizontal: 4 },
  empty: {
    padding: DIM.spacing * 2,
    alignItems: 'center',
    borderRadius: DIM.borderRadius,
    backgroundColor: `${COLORS.surface}50`,
  },
  emptyText: {
    color: COLORS.secondaryText,
    fontSize: 16,
    fontWeight: '500',
    marginTop: DIM.spacing / 2,
  },

  // ────────────────────────────────────────────────────────────────────
  // Styles for the edit form:
  taskFormContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: DIM.spacing,
    marginBottom: DIM.spacing / 2,
  },
  inputContainer: { marginBottom: 16 },
  formLabel: {
    color: COLORS.secondaryText,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
  ml10: { marginLeft: 10 },
  pickerContainer: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: { color: '#fff', height: 50 },
  dateButton: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: { color: '#fff', fontSize: 16, marginLeft: 8 },
  formButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  saveButton: {
    padding: 10,
    marginRight: 16,
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 6,
  },
  cancelButton: {
    padding: 10,
    backgroundColor: `${COLORS.danger}33`,
    borderRadius: 6,
  },
});
