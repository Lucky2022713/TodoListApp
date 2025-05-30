// context/TasksContext.js

import React, { createContext, useContext, useState } from 'react';

// Create a single context for both tasks + history
const TasksContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);

  // Add a new task (also records a history entry)
  const addTask = (taskObj) => {
    const id = Date.now().toString();
    const newTask = { id, ...taskObj };
    setTasks((prev) => [...prev, newTask]);

    // Record to history
    setHistory((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        action: 'added',
        text: `${newTask.text} (Cat: ${newTask.category}, Prio: ${newTask.priority})`,
        date: new Date(),
      },
    ]);
  };

  // Edit an existing task (also records a history entry)
  const editTask = (id, updatedObj) => {
    const original = tasks.find((t) => t.id === id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { id, ...updatedObj } : t))
    );
    if (original) {
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          action: 'edited',
          text: `${original.text} → ${updatedObj.text}`,
          date: new Date(),
        },
      ]);
    }
  };

  // Delete a task (also records a history entry)
  const deleteTask = (id) => {
    const toDelete = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (toDelete) {
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          action: 'deleted',
          text: toDelete.text,
          date: new Date(),
        },
      ]);
    }
  };

  // Delete a single history entry
  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  // Clear all history entries
  const clearHistory = () => setHistory([]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        history,
        addTask,
        editTask,
        deleteTask,
        deleteHistory,
        clearHistory,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
