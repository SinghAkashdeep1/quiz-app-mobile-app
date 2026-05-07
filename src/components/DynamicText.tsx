import React from 'react';
import { Text, TextProps } from 'react-native';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

interface DynamicTextProps extends TextProps {
  children: string;
}

export const DynamicText: React.FC<DynamicTextProps> = ({ children, style, ...props }) => {
  const { t } = useAutoTranslate();
  
  return (
    <Text style={style} {...props}>
      {t(children, children)}
    </Text>
  );
};
