import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Spinner from "@/components/ui/Spinner/Spinner";
import { useState } from "react";
import "./Auth.scss";

type authProps = {
  onSignIn: () => void;
};

function Auth({ onSignIn }: authProps) {
  const [isLoading] = useState(false);
  const signIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSignIn();
  };

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
            <Input className="auth-form__input" name="idInstance" autoComplete="off" placeholder="Введите idInstance" />
          </label>
          <label className="auth-form__field">
            <span className="auth-form__label">Токен</span>
            <Input
              className="auth-form__input"
              name="apiTokenInstance"
              type="password"
              autoComplete="off"
              placeholder="Введите apiTokenInstance"
            />
          </label>
          <div className="auth-form__error" role="alert"></div>
          <Button className="auth-form__submit" type="submit">
            {isLoading ? <Spinner /> : "Войти"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default Auth;
