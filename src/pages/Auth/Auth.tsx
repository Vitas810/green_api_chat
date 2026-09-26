import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Spinner from "@/components/ui/Spinner/Spinner";
import { type Dispatch, type SetStateAction, useState } from "react";
import { getSettings } from "@/api/settings";
import type { Credentials, InstanceSettings } from "@/shared/types";
import "./Auth.scss";

type AuthProps = {
  onSignIn: (credentials: Credentials, settings: InstanceSettings) => void;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
  credentials: Credentials;
  formError: string;
  setFormError: (message: string) => void;
};

function Auth({
  onSignIn,
  credentials,
  formError,
  setCredentials,
  setFormError,
}: AuthProps) {
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const idInstance = credentials.idInstance.trim();
    const apiTokenInstance = credentials.apiTokenInstance.trim();

    if (!idInstance || !apiTokenInstance) {
      setFormError("Заполните оба поля.");
      return;
    }

    setFormError("");
    setIsLoadingAuth(true);

    try {
      const instanceCredentials = { idInstance, apiTokenInstance };
      const settings = await getSettings(instanceCredentials);
      sessionStorage.setItem("greenApiCredentials", JSON.stringify(instanceCredentials));
      onSignIn(instanceCredentials, settings);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось подключиться к GREEN-API.");
    } finally {
      setIsLoadingAuth(false);
    }

  };

  const isDisabled = isLoadingAuth || !credentials.idInstance.trim() || !credentials.apiTokenInstance.trim();

  return (
    <main className="auth">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__header-mark" aria-hidden="true">
            ●
          </span>
          <span className="auth-card__header-name">WhatsApp</span>
        </div>
        <h3 className="auth-card__subtitle">Введите данные из системы GREEN-API, чтобы открыть интерфейс.</h3>
        <form className="auth-form" onSubmit={signIn}>
          <label className="auth-form__field">
            <span className="auth-form__label">Идентификатор аккаунта</span>
            <Input
              className="auth-form__input"
              name="idInstance"
              autoComplete="off"
              placeholder="Введите idInstance"
              value={credentials.idInstance}
              onChange={(event) => setCredentials({ ...credentials, idInstance: event.target.value })}
            />
          </label>

          <label className="auth-form__field">
            <span className="auth-form__label">Токен</span>
            <Input
              className="auth-form__input"
              name="apiTokenInstance"
              type="password"
              autoComplete="off"
              placeholder="Введите apiTokenInstance"
              value={credentials.apiTokenInstance}
              onChange={(event) => setCredentials({ ...credentials, apiTokenInstance: event.target.value })}
            />
          </label>

          {formError && <div className="auth-form__error" role="alert">{formError}</div>}
          <Button className="auth-form__submit" type="submit" disabled={isDisabled}>
            {isLoadingAuth ? <Spinner /> : "Войти"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default Auth;
