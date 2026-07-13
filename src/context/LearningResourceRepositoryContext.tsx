import React, { createContext, useContext } from 'react';
import { learningResourceRepository, LearningResourceRepository } from '../resources/repository/LearningResourceRepository';

const LearningResourceRepositoryContext = createContext<LearningResourceRepository>(learningResourceRepository);

export const LearningResourceRepositoryProvider: React.FC<{
  children: React.ReactNode;
  repository?: LearningResourceRepository;
}> = ({ children, repository }) => {
  const repoInstance = repository || learningResourceRepository;
  return (
    <LearningResourceRepositoryContext.Provider value={repoInstance}>
      {children}
    </LearningResourceRepositoryContext.Provider>
  );
};

export const useLearningResources = () => {
  return useContext(LearningResourceRepositoryContext);
};
