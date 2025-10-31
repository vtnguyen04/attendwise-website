import { ReactNode } from "react";

export const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-xl text-gray-500 sm:mt-4">{description}</p>
      </div>
      <div className="mt-12">{children}</div>
    </section>
  );
};