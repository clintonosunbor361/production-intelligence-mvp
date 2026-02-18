import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { AuthProvider } from './context/AuthContext';

// Pages
import ManageTailors from './pages/Admin/Tailors';
import ManageProductTypes from './pages/Admin/ProductTypes';
import ManageCategories from './pages/Admin/Categories';
import ManageTaskTypes from './pages/Admin/TaskTypes';
import ItemList from './pages/Production/ItemList';
import CreateItem from './pages/Production/CreateItem';
import QCQueue from './pages/QC/QCQueue';
import ManageItemTasks from './pages/QC/ManageItemTasks';
import PendingVerification from './pages/Accounts/PendingVerification';
import Receiving from './pages/Completion/Receiving';
import Dashboard from './pages/Dashboard/Dashboard';



function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tailors" element={<ManageTailors />} />
            <Route path="/products" element={<ManageProductTypes />} />
            <Route path="/categories" element={<ManageCategories />} />
            <Route path="/rates" element={<ManageTaskTypes />} />

            {/* Production */}
            <Route path="/production" element={<ItemList />} />
            <Route path="/production/create" element={<CreateItem />} />

            {/* QC */}
            <Route path="/qc" element={<QCQueue />} />
            <Route path="/qc/item/:itemId" element={<ManageItemTasks />} />

            {/* Accounts */}
            <Route path="/accounts" element={<PendingVerification />} />

            {/* Completion */}
            <Route path="/receiving" element={<Receiving />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
