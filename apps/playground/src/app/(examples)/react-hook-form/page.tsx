"use client";

import { ResultBox } from "@/app/_components/result-box";
import { StyledButton } from "@/app/_components/styled-button";
import { StyledHeading } from "@/app/_components/styled-heading";
import { StyledInput } from "@/app/_components/styled-input";
import { useHookFormAction } from "@next-cool-action/adapter-react-hook-form/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAction } from "./login-action";
import { loginSchema } from "./validation";

export default function ReactHookFormPage() {
	const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(
		loginAction,
		zodResolver(loginSchema),
		{
			formProps: {
				mode: "onChange",
			},
			actionProps: {
				onSuccess(args) {
					console.log("onSuccess callback:", args);
					window.alert("Logged in successfully!");
				},
				onError(args) {
					console.log("onError callback:", args);
				},
				onSettled(args) {
					console.log("onSettled callback:", args);
				},
				onExecute(args) {
					console.log("onExecute callback:", args);
				},
			},
		}
	);

	return (
		<main className="w-96 max-w-full px-4">
			<StyledHeading>Action using useHookFormAction</StyledHeading>
			<p className="mt-2 text-sm text-gray-600">
				Use <code className="bg-gray-100 px-1 rounded">admin</code> /{" "}
				<code className="bg-gray-100 px-1 rounded">password</code> to login successfully.
			</p>
			<form onSubmit={handleSubmitWithAction} className="mt-8 flex flex-col space-y-4">
				<div>
					<StyledInput
						{...form.register("username")}
						placeholder="Username"
						className={form.formState.errors.username ? "border-red-500" : ""}
					/>
					{form.formState.errors.username && (
						<p className="mt-1 text-sm text-red-500">{form.formState.errors.username.message}</p>
					)}
				</div>
				<div>
					<StyledInput
						{...form.register("password")}
						type="password"
						placeholder="Password"
						className={form.formState.errors.password ? "border-red-500" : ""}
					/>
					{form.formState.errors.password && (
						<p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
					)}
				</div>
				{form.formState.errors.root && (
					<p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
				)}
				<StyledButton type="submit" disabled={action.isExecuting}>
					{action.isExecuting ? "Logging in..." : "Login"}
				</StyledButton>
				<StyledButton type="button" onClick={resetFormAndAction}>
					Reset form and action
				</StyledButton>
			</form>
			<ResultBox result={action.result} status={action.status} />
		</main>
	);
}
