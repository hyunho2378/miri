// Cloud Functions 런타임이 CommonJS 진입점을 요구할 때 쓰는 껍데기
exports.main = async (params) => (await import('./ncpAction.mjs')).main(params)
