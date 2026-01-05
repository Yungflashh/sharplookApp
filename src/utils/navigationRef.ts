import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation.types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params as any);
  } else {
    console.warn('Navigation not ready yet');
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}