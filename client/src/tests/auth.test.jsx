import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';

describe('TalentFlow Front-End Authentication UI (Phase 3)', () => {
  it('renders login form elements properly', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome to Talent/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/recruiter@talentflow.local/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Quick-Fill Test Accounts/i)).toBeInTheDocument();
  });

  it('renders registration form with role buttons and input fields', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Create an Account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Eya Ezdine/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/eya@company.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RECRUITER/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ADMIN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });
});
