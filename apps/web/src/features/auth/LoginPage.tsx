import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { loginSchema } from '@iw001/shared';
import { useAuthStore } from '@/store/auth.store';
import { useLogin } from './useAuth';

/**
 * Login screen. Validates client-side with the SAME zod schema the server
 * uses (via @iw001/shared), so the error messages are consistent and we
 * never need to reimplement them.
 */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const authedUser = useAuthStore((s) => s.user);
  const login = useLogin();

  if (authedUser) {
    return <Navigate to="/" replace />;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? '_root';
        errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    login.mutate(parsed.data, {
      onSuccess: () => navigate('/', { replace: true }),
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl"
        noValidate
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-brand-500" aria-hidden />
          <h1 className="text-xl font-bold text-neutral-100">IOTWORKS DESK</h1>
          <p className="mt-1 text-xs text-neutral-500">IoT 통합 유지보수·운영 대시보드</p>
        </div>

        <label className="label" htmlFor="email">
          이메일
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          required
        />
        {fieldErrors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-400">
            {fieldErrors.email}
          </p>
        )}

        <label className="label mt-4" htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!fieldErrors.password}
          required
        />
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
        )}

        {login.isError && (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.
          </p>
        )}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={login.isPending}>
          {login.isPending ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
