"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function HomePage() {
  const t = useTranslations("common");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-t from-white to-slate-200 py-10 min-h-screen"
    >
      <motion.div
        className="container mx-auto flex flex-col gap-4 items-center justify-center bg-white rounded-2xl p-6 min-h-[85vh]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="grid grid-cols-1 gap-1 text-center items-center justify-center mt-10 md:mt-0"
          variants={itemVariants}
        >
          <h1 className="text-2xl font-bold">{t("appName")}</h1>
          <p className="text-sm text-slate-500">{t("whatLookingFor")}</p>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <Link
              className="group relative overflow-hidden h-80 w-60 bg-gray-100 border text-gray-500 hover:bg-blue-200 border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col gap-2 items-center justify-center text-center transition-all duration-300 hover:scale-105"
              href="/personal"
            >
              <Image
                className="absolute bottom-0 left-0  -translate-x-10 translate-y-10 transition-all duration-300 group-hover:left-14"
                src="/man3dai2.png"
                alt="Personal Badges"
                width={200}
                height={200}
              />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-gray-500 to-transparent to-70% transition-opacity duration-300 group-hover:opacity-75"></div>
              <h1 className="text-lg font-bold z-10 absolute bottom-5 text-white transition-all duration-300 group-hover:scale-110">
                {t("applyingForPersonalBadges")}
              </h1>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href="/vehicles"
              className="group relative overflow-hidden h-80 w-60 bg-gray-100 border text-gray-500 hover:bg-green-200 border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col gap-2 items-center justify-center text-center transition-all duration-300 hover:scale-105"
            >
              <Image
                className="absolute top-10 left-0 -translate-x-10 translate-y-10 transition-all duration-300 group-hover:left-14"
                src="/Car.png"
                alt="Personal Badges"
                width={200}
                height={200}
              />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-gray-500 to-transparent to-70% transition-opacity duration-300 group-hover:opacity-75"></div>
              <h1 className="text-lg font-bold z-10 absolute bottom-5 text-white transition-all duration-300 group-hover:scale-110">
                {t("applyingForVehicleBadges")}
              </h1>
            </Link>
          </motion.div>

        </motion.div>
      </motion.div>
    </motion.main>
  );
}
