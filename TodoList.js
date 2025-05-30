// TodoList.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function TodoList() {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState([]);

  const addTask = () => {
    if (!task.trim()) {
      Alert.alert('Error', 'Please enter a task.');
      return;
    }
    const newTask = {
      id: Date.now().toString(),
      text: task.trim(),
      completed: false,
    };
    setTasks([newTask, ...tasks]);
    setTask('');
  };

  const toggleComplete = (id) => {
    setTasks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const renderItem = ({ item }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity onPress={() => toggleComplete(item.id)}>
        <FontAwesome
          name={item.completed ? 'check-circle' : 'circle-thin'}
          size={24}
          color={item.completed ? '#4A90E2' : '#999'}
          style={{ marginRight: 12 }}
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.taskText,
          item.completed && styles.taskTextCompleted,
        ]}
      >
        {item.text}
      </Text>
      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <FontAwesome name="trash" size={20} color="#e33057" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>My To-Do List</Text>

        <View style={styles.inputGroup}>
          <TextInput
            placeholder="Add a new task"
            placeholderTextColor="#aaa"
            value={task}
            onChangeText={setTask}
            style={styles.input}
            onSubmitEditing={addTask}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addTask} activeOpacity={0.8}>
            <FontAwesome name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks yet, add some!</Text>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
  },
  addButton: {
    marginLeft: 15,
    backgroundColor: '#4A90E2',
    borderRadius: 26,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 18,
    marginTop: 60,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  taskText: {
    flex: 1,
    fontSize: 18,
    color: '#222',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
});
