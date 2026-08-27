import { LoginForm } from "@/components/login-form";


const LoginPage = () => {

  return (
     <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
        <div className="text-center text-xs text-gray-400">Powered by Clara.ai - v 1.4.7</div>
      </div>
      <div className="bg-muted relative hidden lg:block h-[100svh]">
        <img
          src="/bg.webp"
          alt="Image"
          className="absolute inset-0 w-full h-full  object-cover dark:brightness-[0.7]"
        />
      </div>
    </div>
  );
};

export default LoginPage;
