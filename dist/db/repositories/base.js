"use strict";
/**
 * Base repository interface for repository pattern
 * Allows web and desktop to use different implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDesktop = isDesktop;
exports.selectRepository = selectRepository;
/**
 * Environment detection
 */
function isDesktop() {
    return typeof window !== 'undefined' && 'electronAPI' in window;
}
/**
 * Runtime repository selector
 */
function selectRepository(webRepo, desktopRepo) {
    return isDesktop() ? desktopRepo : webRepo;
}
//# sourceMappingURL=base.js.map