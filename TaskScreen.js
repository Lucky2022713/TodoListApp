// TaskScreen.js
// Contains TaskContext and provider hooks

import React, { useState, createContext, useContext } from 'react';

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);

  const addTask = taskObj => {
    const id = Date.now().toString();
    const newTask = { id, ...taskObj };
    setTasks(prev => [...prev, newTask]);
    setHistory(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        action: 'added',
        text: `${newTask.text} (Cat: ${newTask.category}, Prio: ${newTask.priority})`,
        date: new Date(),
      },
    ]);
  };

  const editTask = (id, updatedObj) => {
    const original = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => (t.id === id ? { id, ...updatedObj } : t)));
    if (original) {
      setHistory(prev => [
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

  const deleteTask = id => {
    const toDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (toDelete) {
      setHistory(prev => [
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

  const deleteHistory = id => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const clearHistory = () => setHistory([]);

  return (
    <TaskContext.Provider
      value={{ tasks, history, addTask, editTask, deleteTask, deleteHistory, clearHistory }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}
