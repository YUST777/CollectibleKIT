'use client';

import React from 'react';
import { useCurrentTab } from '@/store/useAppStore';

const tabTitles = {
  story: 'Story Puzzle Cutter',
  tasks: 'Tasks',
  game: 'Daily Game',
  collection: 'Gift Collection Designer',
  profile: 'Profile',
};

const tabSubtitles = {
  story: 'Transform your photos into puzzle stories!',
  tasks: 'Complete tasks to earn rewards',
  game: 'Guess the gift and win TON!',
  collection: 'Create your perfect gift combination',
  profile: 'Manage your account',
};

export const Header: React.FC = () => {
  // Don't show header for any tab - titles are ugly
  return null;
};
