import { useEffect, useState, type FormEvent } from 'react';
import {
  createUserSchema,
  updateUserSchema,
  ROLE_IDS,
  ROLES,
  type CreateUserDto,
  type RoleId,
  type UpdateUserDto,
} from '@iw001/shared';
import { useCreateUser, useUpdateUser } from '../api/useUsers';
import type { UserRow, UserStatus } from '../types';

interface Props {
  user: UserRow | null;
  onClose(): void;
  /** Called with the temporary password when a new user is created w/o one. */
  onCreatedWithTempPassword(tempPassword: string, email: string): void;
}

export function UserFormModal({ user, onClose, onCreatedWithTempPassword }: Props) {
  const isEdit = !!user;
  const [form, setForm] = useState<{
    email: string;
    name: string;
    phone: string;
    department: string;
    role: RoleId;
    status: UserStatus;
    initialPassword: string;
  }>(() => ({
    email: user?.email ?? '',
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    department: user?.department ?? '',
    role: user?.role ?? 'viewer',
    status: user?.status ?? 'active',
    initialPassword: '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isEdit) {
      const payload: UpdateUserDto = {
        name: form.name,
        phone: form.phone || undefined,
        department: form.department || undefined,
        role: form.role,
        status: form.status,
      };
      const parsed = updateUserSchema.safeParse(payload);
      if (!parsed.success) {
        setErrors(flattenIssues(parsed.error));
        return;
      }
      setErrors({});
      update.mutate(parsed.data, { onSuccess: onClose });
      return;
    }

    const payload: CreateUserDto = {
      email: form.email,
      name: form.name,
      phone: form.phone || undefined,
      department: form.department || undefined,
      role: form.role,
      initialPassword: form.initialPassword || undefined,
    };
    const parsed = createUserSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error));
      return;
    }
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: (response) => {
        if (response.initialPassword) {
          onCreatedWithTempPassword(response.initialPassword, response.user.email);
        }
        onClose();
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
        noValidate
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? '사용자 수정' : '새 사용자'}
          </h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="email">
              이메일 *
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={isEdit}
              required
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="name">
              이름 *
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="phone">
              연락처
            </label>
            <input
              id="phone"
              className="input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="department">
              부서
            </label>
            <input
              id="department"
              className="input"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              역할 *
            </label>
            <select
              id="role"
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleId }))}
            >
              {ROLE_IDS.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r].label}
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="label" htmlFor="status">
                상태
              </label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as UserStatus }))
                }
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="locked">잠김</option>
              </select>
            </div>
          )}

          {!isEdit && (
            <div className="col-span-2">
              <label className="label" htmlFor="initialPassword">
                초기 비밀번호 (선택)
              </label>
              <input
                id="initialPassword"
                type="password"
                className="input"
                placeholder="비워두면 임시 비밀번호가 자동 생성됩니다"
                value={form.initialPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, initialPassword: e.target.value }))
                }
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                사용자는 최초 로그인 시 강제로 변경해야 합니다.
              </p>
              {errors.initialPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.initialPassword}</p>
              )}
            </div>
          )}
        </div>

        {(create.isError || update.isError) && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다. 이메일 중복 또는 권한 부족일 수 있습니다.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

function flattenIssues(err: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    out[i.path.join('.') || '_root'] = i.message;
  }
  return out;
}
