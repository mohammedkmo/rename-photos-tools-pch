'use client'

import { ArrowLeft, Check, Github, Languages } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { HEADER_ACTION_SLOT, HEADER_DOC_SLOT } from "@/components/layout/HeaderPortal";

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

    // A sheet is an open file, so it gets a way back rather than navigation.
    const onSheet = pathname !== `/${locale}` && pathname !== `/${locale}/`;

    return (
        <header className={`flex-none h-14 flex items-center gap-2 px-4  ${onSheet ? 'bg-pch-ground' : 'bg-pch-surface'}`}>
            {onSheet ? (
                <>
                    <Link
                        href={`/${locale}`}
                        title={t('backToApplications')}
                        aria-label={t('backToApplications')}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-pch-ink2 hover:bg-pch-subtle hover:text-pch-ink transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                    {/* Document identity: which file is open and whether it is saved. */}
                    <div id={HEADER_DOC_SLOT} className="flex items-center gap-2 min-w-0" />
                </>
            ) : (
                <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0 ps-1">
                    <Image
                        src="/logo.png"
                        alt="PetroChina"
                        width={132}
                        height={19}
                        priority
                        className="h-[17px] w-auto"
                    />
                    <span className="hidden sm:inline text-[13px] font-medium text-pch-ink3 border-s border-pch-line2 ps-2.5">
                        {t('appName')}
                    </span>
                </Link>
            )}

            <div className="ms-auto flex items-center gap-1">
                {/* Tools that act on the open file: sharing, help. */}
                <div id={HEADER_ACTION_SLOT} className="flex items-center gap-1" />

                {!onSheet && (

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

                )}

                

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
