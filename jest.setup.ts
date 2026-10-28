import {jest} from '@jest/globals';
import React from 'react';
import {Text} from 'react-native';

// Keep native storage and platform APIs out of unit tests unless a test explicitly injects them.
const mockMaterialDesignIcon = Object.assign(
  ({name}: {name?: string}) => React.createElement(Text, null, name ?? 'icon'),
  {getImageSource: jest.fn()},
);

jest.mock('@react-native-vector-icons/material-design-icons', () => ({
  __esModule: true,
  default: mockMaterialDesignIcon,
}));
