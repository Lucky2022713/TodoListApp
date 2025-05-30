import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function HomeScreen({ navigation }) {
  const { token } = useAuth();

  // Form state
  const [taskText, setTaskText] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState('High');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formatting functions
  const formatDate = d =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = t =>
    t.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  // Handlers
  const handleDateChange = (_, selected) => {
    setShowDatePicker(false);
    if (selected) setDueDate(selected);
  };

  const handleTimeChange = (_, selected) => {
    setShowTimePicker(false);
    if (selected) setDueTime(selected);
  };

  const resetForm = () => {
    setTaskText('');
    setCategory('Work');
    setPriority('High');
    setDueDate(new Date());
    setDueTime(new Date());
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!taskText.trim()) {
      return Alert.alert('Error', 'Task name is required');
    }
    if (!token) {
      return Alert.alert('Error', 'Authentication required');
    }

    const payload = {
      text: taskText.trim(),
      category,
      priority,
      due_date: dueDate.toISOString().split('T')[0],
      due_time: `${dueTime.getHours()}:${dueTime.getMinutes()}:00`,
      notes: notes.trim() || null,
      completed: 0,
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(res.statusText);

      resetForm();
      Alert.alert('Success', 'Task created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.title}>Create New Task</Text>

              {/* Task Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Task Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter task name..."
                  placeholderTextColor="#888"
                  value={taskText}
                  onChangeText={setTaskText}
                />
              </View>

              {/* Category & Priority */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.flex]}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={category}
                      onValueChange={setCategory}
                      style={styles.picker}
                      dropdownIconColor="#666"
                    >
                      {['Work', 'Personal', 'Shopping', 'Others'].map(opt => (
                        <Picker.Item key={opt} label={opt} value={opt} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.flex, styles.ml10]}>
                  <Text style={styles.label}>Priority</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={priority}
                      onValueChange={setPriority}
                      style={styles.picker}
                      dropdownIconColor="#666"
                    >
                      {['High', 'Medium', 'Low'].map(opt => (
                        <Picker.Item key={opt} label={opt} value={opt} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.flex]}>
                  <Text style={styles.label}>Due Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={18} color="#fff" />
                    <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                    />
                  )}
                </View>

                <View style={[styles.inputContainer, styles.flex, styles.ml10]}>
                  <Text style={styles.label}>Due Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time" size={18} color="#fff" />
                    <Text style={styles.dateText}>{formatTime(dueTime)}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={dueTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                    />
                  )}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Add notes..."
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <LinearGradient
                    colors={['#6366f1', '#3b82f6']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Create Task</Text>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 40 },
  card: {
    backgroundColor: '#2d2d2d',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  inputContainer: { marginBottom: 20 },
  label: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  notesInput: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
  ml10: { marginLeft: 10 },
  pickerContainer: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: { color: '#fff', height: 50 },
  dateButton: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: { color: '#fff', fontSize: 16, marginLeft: 10 },
  submitButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  buttonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
