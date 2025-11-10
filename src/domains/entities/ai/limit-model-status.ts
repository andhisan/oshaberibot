interface ILimitModelStatus {
	totalTokenSum: number;
	requestCount: number;
}

export class LimitModelStatus implements ILimitModelStatus {
	constructor(
		public totalTokenSum: number,
		public requestCount: number,
	) {}
}
