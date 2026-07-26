'use client'

import { Check, Github, Languages } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'cn', name: '中文' },
];

export default function Header() {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('common');

    // A plain link reloads the document, which keeps next-intl's server-rendered
    // messages in step with the locale in the URL.
    const languageHref = (newLocale: string) =>
        `/${newLocale}${pathname.replace(`/${locale}`, '')}`;

    const tabs = [
        { href: `/${locale}/personal`, label: t('personalBadges') },
        { href: `/${locale}/vehicles`, label: t('vehicleBadges') },
    ];

    return (
        <header className="flex-none h-14 flex items-center gap-4 px-4 bg-pch-surface border-b border-pch-line">
            <Link href={`/${locale}/personal`} className="flex items-center gap-2.5 shrink-0 ps-1">
                <Image
                    src="/logo.png"
                    alt="PetroChina"
                    width={132}
                    height={19}
                    priority
                    className="h-[17px] w-auto"
                />
                <span className="hidden sm:inline text-[13px] font-medium text-pch-ink3 border-s border-pch-line2 ps-2.5">
                    {t('appShortName')}
                </span>
            </Link>

            {/* Segmented control rather than loose links: two modes of one tool */}
            <nav className="flex items-center gap-0.5 p-[3px] rounded-[10px] bg-pch-subtle border border-pch-line">
                {tabs.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                "px-3 h-7 flex items-center rounded-[7px] text-[13px] whitespace-nowrap transition-all",
                                active
                                    ? "bg-white text-pch-ink font-semibold shadow-[0_1px_2px_rgba(10,37,64,0.10)]"
                                    : "text-pch-ink3 font-medium hover:text-pch-ink2"
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="ms-auto flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-pch-ink2 hover:bg-pch-subtle transition-colors"
                        >
                            <Languages className="h-4 w-4 text-pch-ink3" />
                            <span className="hidden sm:inline">
                                {LANGUAGES.find((lang) => lang.code === locale)?.name}
                            </span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[9rem]">
                        {LANGUAGES.map((lang) => (
                            <DropdownMenuItem key={lang.code} asChild>
                                <a href={languageHref(lang.code)} className="flex items-center justify-between">
                                    {lang.name}
                                    {lang.code === locale && <Check className="h-3.5 w-3.5 text-pch-accent" />}
                                </a>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <a
                    href="https://github.com/mohammedkmo/hfyc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-pch-ink3 hover:text-pch-ink hover:bg-pch-subtle transition-colors"
                    aria-label="GitHub"
                >
                    <Github size={15} />
                </a>
            </div>
        </header>
    );
}
