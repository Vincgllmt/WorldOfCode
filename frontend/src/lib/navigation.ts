export function isActive(href: string, pathname: string): boolean {
    if (href === "/home") {
        return pathname === "/home"
    }
    return pathname.startsWith(href)
}
