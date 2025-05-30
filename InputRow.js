import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const InputRow = forwardRef(
  (
    {
      icon,
      value,
      onChangeText,
      placeholder,
      secureTextEntry = false,
      keyboardType = 'default',
      returnKeyType = 'done',
      onSubmitEditing = () => {},
      focused = false,
      setFocused = () => {},
      autoCapitalize = 'none',
      autoCorrect = false,
    },
    ref
  ) => {
    return (
      <View style={[styles.inputGroup, focused && styles.inputGroupFocused]}>
        <FontAwesome name={icon} size={20} color="#fff" style={styles.icon} />
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#fff"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          blurOnSubmit={false}
        />
      </View>
    );
  }
);

export default InputRow;

const styles = StyleSheet.create({
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    paddingBottom: 5,
    paddingHorizontal: 5,
  },
  inputGroupFocused: {
    borderBottomColor: '#fff',
    borderBottomWidth: 2,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 0,
  },
});
