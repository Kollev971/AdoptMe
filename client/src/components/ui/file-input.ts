                                          import * as RadixFileInput from "@radix-ui/react-file-input";

                                          interface CustomFileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
                                            // Може да добавиш всякакви специфични пропс, които да предадеш на компонента
                                          }

                                          export const CustomFileInput: React.FC<CustomFileInputProps> = (props) => {
                                            return (
                                              <RadixFileInput.FileInput
                                                {...props}
                                                className="bg-transparent border border-gray-300 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:ring-blue-500 focus:ring-2 focus:border-blue-500"
                                              />
                                            );
                                          };