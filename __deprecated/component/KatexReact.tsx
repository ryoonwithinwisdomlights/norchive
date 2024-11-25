import KaTeX from "katex";
import React, { ReactNode, useEffect, useState } from "react";
// 타입 정의
interface TeXProps {
  children?: string;
  math?: string;
  block?: boolean;
  errorColor?: string;
  renderError?: (error: Error) => ReactNode;
  settings?: KaTeX.KatexOptions;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any; // 추가적인 prop 허용
}

interface StateProps {
  innerHtml?: string;
  errorElement?: ReactNode;
}

const TeX: React.FC<TeXProps> = ({
  children,
  math,
  block = false,
  errorColor,
  renderError,
  settings,
  as: asComponent = "span", // 기본값 설정,
  ...props
}) => {
  const Component = asComponent || (block ? "div" : "span");
  // const Component = asComponent; // JSX에서 사용할 컴포넌트 지정
  const content = children ?? math;

  // const [state, setState] = useState<{ innerHtml: string; errorElement?: ReactNode }>({ innerHtml: "" });
  const [state, setState] = useState<StateProps>({ innerHtml: "" });

  useEffect(() => {
    try {
      if (!content) {
        setState({ innerHtml: "" });
        return;
      }

      const innerHtml = KaTeX.renderToString(content, {
        displayMode: block,
        errorColor,
        throwOnError: !!renderError,
        ...settings,
      });

      setState({ innerHtml });
    } catch (error) {
      if (error instanceof KaTeX.ParseError || error instanceof TypeError) {
        if (renderError) {
          setState({ errorElement: renderError(error) });
        } else {
          setState({ innerHtml: error.message });
        }
      } else {
        throw error;
      }
    }
  }, [block, content, errorColor, renderError, settings]);

  if ("errorElement" in state) {
    return state.errorElement;
  }

  return (
    <Component
      {...props}
      dangerouslySetInnerHTML={{ __html: state.innerHtml }}
    />
  );
};

export default React.memo(TeX);
