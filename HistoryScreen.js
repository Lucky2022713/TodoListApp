// /todoList/frontend/screens/HistoryScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function HistoryScreen() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        return Alert.alert('Error', data.message || 'Could not fetch history');
      }
      setHistory(data);
    } catch (err) {
      setLoading(false);
      console.error('Error fetching history:', err);
      Alert.alert('Network Error', 'Could not connect to server.');
    }
  };

  const deleteHistoryItem = (id) => {
    if (!token) return;
    Alert.alert(
      'Confirm Delete',
      'Delete this history entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/history/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) {
                return Alert.alert('Error', data.message || 'Could not delete');
              }
              fetchHistory();
            } catch (err) {
              console.error('Error deleting history:', err);
              Alert.alert('Network Error', 'Could not connect to server.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const clearAllHistory = () => {
    if (!token) return;
    Alert.alert(
      'Confirm',
      'Delete all history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/history`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) {
                return Alert.alert('Error', data.message || 'Could not clear');
              }
              setHistory([]);
            } catch (err) {
              console.error('Error clearing history:', err);
              Alert.alert('Network Error', 'Could not connect to server.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyRow}>
        <Text style={styles.historyText}>
          [{item.action.toUpperCase()}] {item.text}
        </Text>
        <TouchableOpacity onPress={() => deleteHistoryItem(item.id)}>
          <FontAwesome name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.historyDate}>
        {new Date(item.date).toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[...history].reverse()}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.noHistoryText}>No history.</Text>
        }
        ListFooterComponent={
          history.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllHistory}
            >
              <Text style={styles.clearButtonText}>Delete All History</Text>
            </TouchableOpacity>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: '#121212' },
  listContainer: { padding: 16, paddingBottom: 40 },
  historyItem: {
    marginBottom: 12,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  historyDate: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  noHistoryText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 24,
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: '#E94B3C',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
