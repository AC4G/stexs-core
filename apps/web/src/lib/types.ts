export interface MFAMethod {
	icon: string;
	description: string;
}

export interface Friend {
	profiles: {
		user_id: string;
		username: string;
	};
}

export interface ExcludeHeaderRoute {
	pathname: string;
	callback?: () => void;
}
