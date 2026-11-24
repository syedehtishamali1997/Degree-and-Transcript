import React, { createContext, useContext, useState, useCallback } from "react";
import { StudentFormModal } from "../components/modals/StudentFormModal";
import { ViewStudentModal } from "../components/modals/ViewStudentModal";
import { ReturnCaseModal } from "../components/modals/ReturnCaseModal";
import { HistoryModal } from "../components/modals/HistoryModal";
import { RestoreConfirmModal } from "../components/modals/RestoreConfirmModal";
import { WipeConfirmModal } from "../components/modals/WipeConfirmModal";
import { QuickSearchModal } from "../components/modals/QuickSearchModal";
import { DocumentUploadWizardModal } from "../components/modals/DocumentUploadWizardModal";
import { ViewDocumentsModal } from "../components/modals/ViewDocumentsModal";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  // Modal states
  const [studentFormState, setStudentFormState] = useState({ isOpen: false, student: null });
  const [viewStudentState, setViewStudentState] = useState({ isOpen: false, student: null });
  const [returnCaseState, setReturnCaseState] = useState({ isOpen: false, student: null });
  const [historyState, setHistoryState] = useState({ isOpen: false, student: null });
  const [restoreConfirmState, setRestoreConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [wipeConfirmState, setWipeConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [uploadWizardState, setUploadWizardState] = useState({ isOpen: false, student: null });
  const [viewDocsState, setViewDocsState] = useState({ isOpen: false, student: null });

  // Open methods
  const openStudentForm = useCallback((student = null) => {
    setStudentFormState({ isOpen: true, student });
  }, []);

  const closeStudentForm = useCallback(() => {
    setStudentFormState({ isOpen: false, student: null });
  }, []);

  const openViewStudent = useCallback((student) => {
    setViewStudentState({ isOpen: true, student });
  }, []);

  const closeViewStudent = useCallback(() => {
    setViewStudentState({ isOpen: false, student: null });
  }, []);

  const openReturnCase = useCallback((student) => {
    setReturnCaseState({ isOpen: true, student });
  }, []);

  const closeReturnCase = useCallback(() => {
    setReturnCaseState({ isOpen: false, student: null });
  }, []);

  const openHistory = useCallback((student) => {
    setHistoryState({ isOpen: true, student });
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryState({ isOpen: false, student: null });
  }, []);

  const openRestoreConfirm = useCallback((onConfirm) => {
    setRestoreConfirmState({ isOpen: true, onConfirm });
  }, []);

  const closeRestoreConfirm = useCallback(() => {
    setRestoreConfirmState({ isOpen: false, onConfirm: null });
  }, []);

  const openWipeConfirm = useCallback((onConfirm) => {
    setWipeConfirmState({ isOpen: true, onConfirm });
  }, []);

  const closeWipeConfirm = useCallback(() => {
    setWipeConfirmState({ isOpen: false, onConfirm: null });
  }, []);

  const openQuickSearch = useCallback(() => {
    setQuickSearchOpen(true);
  }, []);

  const closeQuickSearch = useCallback(() => {
    setQuickSearchOpen(false);
  }, []);

  const openUploadWizard = useCallback((student) => {
    setUploadWizardState({ isOpen: true, student });
  }, []);

  const closeUploadWizard = useCallback(() => {
    setUploadWizardState({ isOpen: false, student: null });
  }, []);

  const openViewDocuments = useCallback((student) => {
    setViewDocsState({ isOpen: true, student });
  }, []);

  const closeViewDocuments = useCallback(() => {
    setViewDocsState({ isOpen: false, student: null });
  }, []);

  const value = {
    openStudentForm,
    closeStudentForm,
    openViewStudent,
    closeViewStudent,
    openReturnCase,
    closeReturnCase,
    openHistory,
    closeHistory,
    openRestoreConfirm,
    closeRestoreConfirm,
    openWipeConfirm,
    closeWipeConfirm,
    openQuickSearch,
    closeQuickSearch,
    openUploadWizard,
    closeUploadWizard,
    openViewDocuments,
    closeViewDocuments
  };

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* Global Modals Mounted at Root */}
      {studentFormState.isOpen && (
        <StudentFormModal
          isOpen={studentFormState.isOpen}
          studentToEdit={studentFormState.student}
          onClose={closeStudentForm}
        />
      )}

      {viewStudentState.isOpen && (
        <ViewStudentModal
          isOpen={viewStudentState.isOpen}
          student={viewStudentState.student}
          onClose={closeViewStudent}
          onEdit={(s) => {
            closeViewStudent();
            openStudentForm(s);
          }}
          onViewHistory={(s) => {
            closeViewStudent();
            openHistory(s);
          }}
        />
      )}

      {returnCaseState.isOpen && (
        <ReturnCaseModal
          isOpen={returnCaseState.isOpen}
          student={returnCaseState.student}
          onClose={closeReturnCase}
        />
      )}

      {historyState.isOpen && (
        <HistoryModal
          isOpen={historyState.isOpen}
          student={historyState.student}
          onClose={closeHistory}
        />
      )}

      {restoreConfirmState.isOpen && (
        <RestoreConfirmModal
          isOpen={restoreConfirmState.isOpen}
          onClose={closeRestoreConfirm}
          onConfirm={() => {
            if (typeof restoreConfirmState.onConfirm === "function") {
              restoreConfirmState.onConfirm();
            }
            closeRestoreConfirm();
          }}
        />
      )}

      {wipeConfirmState.isOpen && (
        <WipeConfirmModal
          isOpen={wipeConfirmState.isOpen}
          onClose={closeWipeConfirm}
          onConfirm={() => {
            if (typeof wipeConfirmState.onConfirm === "function") {
              wipeConfirmState.onConfirm();
            }
            closeWipeConfirm();
          }}
        />
      )}

      {quickSearchOpen && (
        <QuickSearchModal
          isOpen={quickSearchOpen}
          onClose={closeQuickSearch}
          onSelectStudent={(s) => {
            closeQuickSearch();
            openViewStudent(s);
          }}
        />
      )}

      {uploadWizardState.isOpen && (
        <DocumentUploadWizardModal
          isOpen={uploadWizardState.isOpen}
          student={uploadWizardState.student}
          onClose={closeUploadWizard}
        />
      )}

      {viewDocsState.isOpen && (
        <ViewDocumentsModal
          isOpen={viewDocsState.isOpen}
          student={viewDocsState.student}
          onClose={closeViewDocuments}
          onOpenUploadWizard={() => {
            const s = viewDocsState.student;
            closeViewDocuments();
            openUploadWizard(s);
          }}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModals must be used within a ModalProvider");
  }
  return context;
}
