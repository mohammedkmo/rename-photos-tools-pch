'use client'

import { Github, LanguagesIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

    const links = [
        { href: `/${locale}/personal`, label: t('personalBadges') },
        { href: `/${locale}/vehicles`, label: t('vehicleBadges') },
    ];

    return (
        <header className="flex-none h-14 flex items-center gap-5 px-5 bg-pch-surface border-b border-pch-line">
            <Link href={`/${locale}`} className="flex items-center shrink-0">
                <Image
                    src="/logo.png"
                    alt="PetroChina"
                    width={132}
                    height={19}
                    priority
                    className="h-[18px] w-auto"
                />
            </Link>

            <span className="h-5 w-px bg-pch-line2 shrink-0" aria-hidden="true" />

            <nav className="flex items-center gap-1 overflow-x-auto">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-[13.5px] font-medium whitespace-nowrap transition-colors",
                            pathname === link.href
                                ? "bg-pch-accentSoft text-pch-accentInk font-semibold"
                                : "text-pch-ink2 hover:bg-pch-subtle hover:text-pch-ink"
                        )}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div className="ms-auto flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-pch-ink2">
                            <LanguagesIcon className="h-4 w-4" />
                            <span className="hidden sm:inline text-[13px]">
                                {LANGUAGES.find((lang) => lang.code === locale)?.name}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {LANGUAGES.map((lang) => (
                            <DropdownMenuItem key={lang.code} asChild>
                                <a href={languageHref(lang.code)}>{lang.name}</a>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <a
                    href="https://github.com/mohammedkmo/hfyc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-pch-ink3 hover:text-pch-ink hover:bg-pch-subtle transition-colors"
                    aria-label="GitHub"
                >
                    <Github size={16} />
                </a>
            </div>
        </header>
    );
}
